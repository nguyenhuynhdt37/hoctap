// Bundle with the transpiled src/lib/prepare-image-upload.ts exports and run in
// Chrome evaluate_script. Uses real image decoding/encoding, with no API writes.
async ({ prepareImageUpload, IMAGE_UPLOAD_PROFILES }) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const source = document.createElement('canvas');
  source.width = 3200;
  source.height = 2400;
  const ctx = source.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 3200, 2400);
  gradient.addColorStop(0, '#356fa7');
  gradient.addColorStop(1, '#f7c9d9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 3200, 2400);
  ctx.clearRect(0, 0, 64, 64);
  ctx.font = '64px sans-serif';
  ctx.fillText('Bài tập: x² + y² = 100', 150, 300);
  const blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'lesson.png', { type: 'image/png', lastModified: 12345 });
  for (const [profile, bounds] of Object.entries(IMAGE_UPLOAD_PROFILES)) {
    const output = await prepareImageUpload(file, profile);
    const image = await createImageBitmap(output);
    assert(image.width <= bounds.maxWidth && image.height <= bounds.maxHeight, `${profile}: dimensions`);
    assert(Math.abs(image.width / image.height - 4 / 3) < 0.01, `${profile}: aspect ratio`);
    assert(output.size < file.size, `${profile}: compression`);
    assert(output.type === 'image/webp' && output.name === 'lesson.webp', `${profile}: MIME and filename`);
    assert(output.lastModified === 12345, `${profile}: timestamp`);
    const probe = document.createElement('canvas');
    probe.width = image.width; probe.height = image.height;
    const probeContext = probe.getContext('2d');
    probeContext.drawImage(image, 0, 0);
    assert(probeContext.getImageData(0, 0, 1, 1).data[3] === 0, `${profile}: transparency`);
    results.push({profile, width:image.width, height:image.height, before:file.size, after:output.size});
    image.close();
  }
  source.width = 40; source.height = 20;
  const smallBlob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
  const small = new File([smallBlob], 'small.png', { type: 'image/png' });
  const smallOutput = await prepareImageUpload(small, 'avatar');
  const smallImage = await createImageBitmap(smallOutput);
  assert(smallImage.width === 40 && smallImage.height === 20, 'Never upscale');
  assert(smallOutput.size <= small.size, 'Never enlarge an image within bounds');
  smallImage.close();
  for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', 'application/zip', 'video/mp4']) {
    const attachment = new File(['unchanged'], 'attachment', { type });
    assert(await prepareImageUpload(attachment, 'resource') === attachment, `${type}: preserve attachment`);
  }
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const created = [], revoked = [];
  URL.createObjectURL = (...args) => { const url = originalCreate.apply(URL, args); created.push(url); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); originalRevoke.call(URL, url); };
  try {
    let rejected = false;
    try { await prepareImageUpload(new File(['invalid'], 'broken.png', { type:'image/png' }), 'editor'); }
    catch { rejected = true; }
    assert(rejected, 'Corrupt image rejects');
    assert(created.length === 1 && revoked[0] === created[0], 'Cleanup on decode failure');
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
  return {passed:true, results, extraChecks:['no upscale', 'small file size', 'attachment passthrough', 'corrupt image', 'URL cleanup']};
}
