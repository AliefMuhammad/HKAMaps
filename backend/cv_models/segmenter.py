"""
segmenter.py — Stage 2: classical crack segmentation refinement.

Strategy (no external model weights required):
  1. Crop the detected bounding box region (with padding)
  2. CLAHE contrast enhancement to make cracks visible on low-contrast pavement
  3. Gaussian blur to suppress noise
  4. Adaptive thresholding — cracks appear as dark regions on lighter pavement
  5. Morphological closing to connect broken crack segments
  6. Morphological opening to remove small speckle noise
  7. Retain the largest connected component
  8. Return a full-image binary mask + contour polygon

The mask is in the coordinate space of the ORIGINAL image (not the crop),
so it can be overlaid directly on the annotated output.

If scikit-image is available, skeletonization is used for more accurate length
measurement. If not, contour-based approximation is used as fallback.
"""
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Segmenter
# ---------------------------------------------------------------------------

class ClassicalCrackSegmenter:
    """
    Pure OpenCV-based segmentation. No model weights needed.
    Works best on longitudinal and transverse cracks.
    Less precise on alligator cracks (complex mesh pattern) and potholes
    (3D depression — thresholding picks up shadows, not crack edges).
    """

    # Classes where segmentation adds value
    SEGMENTABLE_CLASSES = frozenset({
        "longitudinal_crack",
        "transverse_crack",
        "alligator_crack",
        "hairline_crack",
        "patching",
    })

    def __init__(
        self,
        clahe_clip_limit: float = 2.5,
        clahe_tile_size: int = 8,
        adaptive_block_size: int = 21,
        adaptive_c: int = 5,
        morph_close_size: int = 5,
        morph_open_size: int = 3,
        bbox_pad_fraction: float = 0.04,
        min_crack_area_px: int = 50,
    ):
        self.clahe = cv2.createCLAHE(
            clipLimit=clahe_clip_limit,
            tileGridSize=(clahe_tile_size, clahe_tile_size),
        )
        self.adaptive_block_size = adaptive_block_size | 1   # must be odd
        self.adaptive_c         = adaptive_c
        self.morph_close_size   = morph_close_size
        self.morph_open_size    = morph_open_size
        self.bbox_pad_fraction  = bbox_pad_fraction
        self.min_crack_area_px  = min_crack_area_px

    # ------------------------------------------------------------------
    def segment(
        self,
        image: np.ndarray,
        bbox: dict,
        class_name: str,
    ) -> tuple[Optional[np.ndarray], Optional[list]]:
        """
        Run segmentation on the region defined by bbox.

        Returns:
          mask     — binary np.uint8 array (same HxW as image), 255 = crack pixel
          polygon  — list of [x, y] points (contour in image coordinates)
                     or None if segmentation failed / produced no useful mask
        """
        if class_name not in self.SEGMENTABLE_CLASSES:
            return None, None

        h_img, w_img = image.shape[:2]
        x1, y1, x2, y2 = self._padded_bbox(bbox, h_img, w_img)

        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or min(crop.shape[:2]) < 8:
            return None, None

        # Grayscale + CLAHE
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        enhanced = self.clahe.apply(gray)

        # Blur
        blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

        # Adaptive threshold — cracks are darker than surrounding pavement
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            self.adaptive_block_size,
            self.adaptive_c,
        )

        # Morphological closing → connect broken crack segments
        k_close = cv2.getStructuringElement(
            cv2.MORPH_RECT, (self.morph_close_size, self.morph_close_size)
        )
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, k_close)

        # Morphological opening → remove small noise blobs
        k_open = cv2.getStructuringElement(
            cv2.MORPH_RECT, (self.morph_open_size, self.morph_open_size)
        )
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k_open)

        # Keep only the largest connected component (removes scattered noise)
        binary = self._largest_component(binary)
        if binary is None or cv2.countNonZero(binary) < self.min_crack_area_px:
            return None, None

        # Place the crop-space mask back into the full-image mask
        full_mask = np.zeros((h_img, w_img), dtype=np.uint8)
        full_mask[y1:y2, x1:x2] = binary

        # Extract contour polygon in full-image coordinates
        polygon = self._extract_polygon(binary, offset_x=x1, offset_y=y1)

        return full_mask, polygon

    # ------------------------------------------------------------------
    def _padded_bbox(self, bbox: dict, h: int, w: int) -> tuple[int, int, int, int]:
        pad_x = int((bbox["x2"] - bbox["x1"]) * self.bbox_pad_fraction)
        pad_y = int((bbox["y2"] - bbox["y1"]) * self.bbox_pad_fraction)
        x1 = max(0, int(bbox["x1"]) - pad_x)
        y1 = max(0, int(bbox["y1"]) - pad_y)
        x2 = min(w, int(bbox["x2"]) + pad_x)
        y2 = min(h, int(bbox["y2"]) + pad_y)
        return x1, y1, x2, y2

    @staticmethod
    def _largest_component(binary: np.ndarray) -> Optional[np.ndarray]:
        n_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            binary, connectivity=8
        )
        if n_labels <= 1:   # only background
            return None
        # Label 0 is background; find the largest foreground label
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        out = np.where(labels == largest, np.uint8(255), np.uint8(0))
        return out

    @staticmethod
    def _extract_polygon(
        binary: np.ndarray, offset_x: int, offset_y: int
    ) -> Optional[list]:
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return None
        # Use the largest contour; approximate to reduce polygon point count
        cnt = max(contours, key=cv2.contourArea)
        epsilon = 0.005 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        return [
            [int(p[0][0]) + offset_x, int(p[0][1]) + offset_y]
            for p in approx
        ]
