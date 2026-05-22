"""
segmenter_deep.py — Optional SegFormer-based road surface ROI segmenter.

Strategy:
  1. Run SegFormer (nvidia/segformer-b2-finetuned-ade-512-512) on the image.
  2. Extract the "road" class pixel mask (ADE20K class 6).
  3. Use this mask as a Region-of-Interest constraint for the classical
     crack segmenter — prevents crack detection in non-road areas (shadows
     on walls, tree lines, vehicle interiors, sky reflections).

ADE20K road-relevant classes used:
  6  = road
  11 = sidewalk / bahu jalan
  13 = earth / gravel road shoulder

Disabled by default (ENABLE_DEEP_SEGMENTER=false).
Falls back gracefully to no-ROI mode (same as current behaviour).

Requirements (optional):
  transformers>=4.40.0
  torch>=2.0.0

Install:
  pip install transformers torch
"""
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ADE20K class indices for road-related surfaces
_ADE_ROAD_CLASSES      = frozenset({6})     # "road, route"
_ADE_SHOULDER_CLASSES  = frozenset({11, 13}) # "sidewalk" + "earth, ground"
_ADE_ALL_ROAD_CLASSES  = _ADE_ROAD_CLASSES | _ADE_SHOULDER_CLASSES


class SegFormerROISegmenter:
    """
    Optional SegFormer segmenter that produces a road-surface pixel mask.

    The mask is used to constrain the classical ClassicalCrackSegmenter
    so it only looks for cracks within the detected road surface area.

    Usage:
        segmenter = SegFormerROISegmenter(model_id="nvidia/segformer-b2-finetuned-ade-512-512")
        if segmenter.available:
            roi_mask = segmenter.get_road_mask(image)  # H×W bool array
    """

    def __init__(self, model_id: str = "nvidia/segformer-b2-finetuned-ade-512-512"):
        self._model      = None
        self._processor  = None
        self._model_id   = model_id
        self._device     = "cpu"
        self._load(model_id)

    def _load(self, model_id: str):
        try:
            from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
            import torch

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info("Loading SegFormer ROI model: %s on %s", model_id, self._device)

            self._processor = SegformerImageProcessor.from_pretrained(model_id)
            self._model     = SegformerForSemanticSegmentation.from_pretrained(model_id)
            self._model     = self._model.to(self._device)
            self._model.eval()

            logger.info("✅ SegFormer ROI segmenter loaded: %s", model_id)
        except ImportError:
            logger.info(
                "transformers/torch not installed — SegFormer ROI disabled. "
                "Install with: pip install transformers torch"
            )
        except Exception as exc:
            logger.warning("SegFormer load failed (%s): %s", model_id, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def get_road_mask(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Returns a binary mask (H×W uint8, values 0/255) of the road surface.
        Returns None if model is unavailable or inference fails.
        """
        if not self.available:
            return None

        try:
            import torch
            from PIL import Image as PILImage

            h, w = image.shape[:2]
            pil_img = PILImage.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

            inputs = self._processor(images=pil_img, return_tensors="pt")
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                logits = self._model(**inputs).logits  # (1, num_classes, H/4, W/4)

            upsampled = torch.nn.functional.interpolate(
                logits, size=(h, w), mode="bilinear", align_corners=False
            )
            pred = upsampled.argmax(dim=1).squeeze().cpu().numpy()  # H×W

            # Combine road + shoulder classes
            road_mask = np.isin(pred, list(_ADE_ALL_ROAD_CLASSES)).astype(np.uint8) * 255

            # Morphological cleanup — fill small holes, remove stray pixels
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            road_mask = cv2.morphologyEx(road_mask, cv2.MORPH_CLOSE, kernel)
            road_mask = cv2.morphologyEx(road_mask, cv2.MORPH_OPEN,
                                         cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

            return road_mask

        except Exception as exc:
            logger.warning("SegFormer inference failed: %s", exc)
            return None

    def constrain_mask_to_road(
        self,
        crack_mask: np.ndarray,
        road_mask: np.ndarray,
    ) -> np.ndarray:
        """
        Apply road ROI constraint to a crack segmentation mask.
        Pixels outside the road surface are zeroed out.
        """
        if road_mask is None:
            return crack_mask
        constrained = cv2.bitwise_and(crack_mask, road_mask)
        return constrained
