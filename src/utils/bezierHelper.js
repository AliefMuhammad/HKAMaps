/**
 * Bezier & Vector Tool Helper untuk Map Editor
 *
 * Mengonversi struktur *nodes* alat gambar (Point + Control Points)
 * menjadi LineString koordinat padat yang dapat digambar oleh MapLibre.
 */

// Menghitung titik pada kurva Cubic Bezier pada waktu `t` (0 - 1)
function getCubicBezierXYatT(startPt, controlPt1, controlPt2, endPt, t) {
  const x =
    Math.pow(1 - t, 3) * startPt[0] +
    3 * Math.pow(1 - t, 2) * t * controlPt1[0] +
    3 * (1 - t) * Math.pow(t, 2) * controlPt2[0] +
    Math.pow(t, 3) * endPt[0];

  const y =
    Math.pow(1 - t, 3) * startPt[1] +
    3 * Math.pow(1 - t, 2) * t * controlPt1[1] +
    3 * (1 - t) * Math.pow(t, 2) * controlPt2[1] +
    Math.pow(t, 3) * endPt[1];

  return [x, y];
}

/**
 * Menerima array Nodes dan mengembalikan path koordinat geo untuk map.
 * Format node: { id, pt: [lng, lat], cpIn: [lng, lat], cpOut: [lng, lat] }
 * Jika cpIn/cpOut kosong, kurva dianggab bersudut patah (garis lurus ke titik itu).
 */
export function computeBezierPath(nodes, segments = 20) {
  if (!nodes || nodes.length < 2) {
    return nodes.map(n => n.pt); // Garis tunggal/kosong
  }

  const path = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const startNode = nodes[i];
    const endNode = nodes[i + 1];

    const p0 = startNode.pt;
    const p1 = startNode.cpOut || startNode.pt;
    const p2 = endNode.cpIn || endNode.pt;
    const p3 = endNode.pt;

    // Untuk memastikan awal segmen tersambung, kita push p0 kalau ini segmen pertama
    if (i === 0) path.push(p0);

    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const point = getCubicBezierXYatT(p0, p1, p2, p3, t);
      path.push(point);
    }
  }

  return path;
}

/**
 * Mengonversi array `[[lng, lat], ...]` statis yang lama 
 * ke format node `[{id, pt, cpIn, cpOut}]` agar bisa diedit di editor baru.
 */
export function convertLinesToNodes(lineCoords) {
  if (!lineCoords || lineCoords.length === 0) return [];
  // Periksa apakah ini sudah dalam format node (object dengan 'pt')
  if (lineCoords[0] && Array.isArray(lineCoords[0].pt)) return lineCoords;

  return lineCoords.map((coord, idx) => ({
    id: `node-${Date.now()}-${idx}`,
    pt: [coord[0], coord[1]],
    cpIn: null, // belum ada lengkungan
    cpOut: null,
  }));
}
