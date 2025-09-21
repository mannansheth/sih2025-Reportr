function convertDMSToDD(dms, ref) {
  if (!dms || dms.length < 3) return null;
  const [deg, min, sec] = dms.map(([num, den]) => num / den);
  let dd = deg + min / 60 + sec / 3600;
  if (ref === "S" || ref === "W") {
    dd = -dd;
  }
  return dd;
}

export const normalizeExif = (exif) => {
  if (!exif?.GPS) return {};

  const lat = parseFloat(convertDMSToDD(exif.GPS[2], exif.GPS[1]).toFixed(7)); // GPSLatitude + GPSLatitudeRef
  const lng = parseFloat(convertDMSToDD(exif.GPS[4], exif.GPS[3]).toFixed(7)); // GPSLongitude + GPSLongitudeRef

  return {
    GPSLatitude: lat,
    GPSLongitude: lng,
  };
}