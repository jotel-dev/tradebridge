from PIL import Image

im = Image.open('/home/joel/tradebridge/app/public/logo.png')
print('Dimensions:', im.size)
bbox = im.getbbox()
print('Non-zero bounding box:', bbox)
# Width and height of artwork:
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]
print(f'Artwork size: {w}x{h}, centered in {im.size[0]}x{im.size[1]}')
