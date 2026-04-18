import io
from PIL import Image, ExifTags
from PIL.TiffImagePlugin import IFDRational
from datetime import datetime

def convert_to_degrees(value):
    d, m, s = value
    return float(d) + (float(m) / 60.0) + (float(s) / 3600.0)

def sanitize_value(v):
    if isinstance(v, IFDRational):
        return float(v) if v.denominator != 0 else 0.0
    elif isinstance(v, tuple):
        return tuple(sanitize_value(x) for x in v)
    elif isinstance(v, list):
        return [sanitize_value(x) for x in v]
    elif isinstance(v, dict):
        return {str(k): sanitize_value(val) for k, val in v.items()}
    elif isinstance(v, bytes):
        try:
            return v.decode("utf-8", "ignore")
        except:
            return str(v)
    return v

def extract_exif(file_bytes: bytes):
    exif_dict = {}
    canonical_date = datetime.utcnow()
    lat, lon, width, height = None, None, None, None

    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.width, img.height
        
        exif = img._getexif()
        if exif:
            for k, v in exif.items():
                tag = ExifTags.TAGS.get(k, k)
                exif_dict[tag] = sanitize_value(v)
            
            # Resolve Date
            dt_str = exif_dict.get('DateTimeOriginal') or exif_dict.get('DateTime')
            if dt_str:
                try:
                    canonical_date = datetime.strptime(str(dt_str), '%Y:%m:%d %H:%M:%S')
                except:
                    pass
            
            # Resolve GPS (Simplified for robust execution)
            if 'GPSInfo' in exif_dict and isinstance(exif_dict['GPSInfo'], dict):
                gps_info = {}
                for key in exif_dict['GPSInfo'].keys():
                    decode = ExifTags.GPSTAGS.get(key, key)
                    gps_info[decode] = exif_dict['GPSInfo'][key]
                
                if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
                    try:
                        lat_val = convert_to_degrees(gps_info['GPSLatitude'])
                        lon_val = convert_to_degrees(gps_info['GPSLongitude'])
                        lat = -lat_val if gps_info.get('GPSLatitudeRef') == 'S' else lat_val
                        lon = -lon_val if gps_info.get('GPSLongitudeRef') == 'W' else lon_val
                    except Exception:
                        pass
    except Exception:
        pass

    return exif_dict, canonical_date, lat, lon, width, height
