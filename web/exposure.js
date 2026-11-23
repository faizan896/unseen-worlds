// Each cross-section joins the three simultaneous probe positions. Project time
// along a third axis so the whole two-second film is visible in one drawing.
export function exposureRenderer(canvas, film, colors, strokes) {
  const context = canvas.getContext('2d');
  const sections = film.map((frame, i) => {
    const time = i / (film.length - 1);
    return frame.map(([x, y]) => [
      .72 * x + .92 * y + 240 * time,
      -.92 * x + .72 * y + 18 * time,
    ]);
  });
  const points = sections.flat();
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.min(...xs), right = Math.max(...xs);
  const top = Math.min(...ys), bottom = Math.max(...ys);

  function path(points, closed = false) {
    const trace = new Path2D();
    trace.moveTo(...points[0]);
    for (const point of points.slice(1)) trace.lineTo(...point);
    if (closed) trace.closePath();
    return trace;
  }
  const ribs = new Path2D();
  for (const section of sections) ribs.addPath(path(section, true));
  const rails = colors.map((_, probe) => path(sections.map(section => section[probe])));

  return function draw(frame, fraction) {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const scale = Math.min(width / (right - left + 16), height / (bottom - top + 14));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-(left + right) / 2, -(top + bottom) / 2);

    context.lineWidth = .75 / scale;
    context.strokeStyle = strokes[2];
    context.globalAlpha = .48;
    context.stroke(ribs);
    context.globalAlpha = .9;
    rails.forEach((rail, index) => {
      context.strokeStyle = strokes[index];
      context.stroke(rail);
    });

    const slice = sections[frame].map(([x, y], probe) => {
      const [nextX, nextY] = sections[frame + 1][probe];
      return [x + (nextX - x) * fraction, y + (nextY - y) * fraction];
    });
    const face = path(slice, true);
    context.fillStyle = colors[1];
    context.globalAlpha = .65;
    context.fill(face);
    context.globalAlpha = 1;
    context.strokeStyle = colors[2];
    context.lineWidth = 1.5 / scale;
    context.stroke(face);
    slice.forEach(([x, y], index) => {
      context.beginPath();
      context.arc(x, y, 2.8 / scale, 0, 2 * Math.PI);
      context.fillStyle = colors[index];
      context.fill();
      context.lineWidth = 1 / scale;
      context.strokeStyle = strokes[index];
      context.stroke();
    });
  };
}
