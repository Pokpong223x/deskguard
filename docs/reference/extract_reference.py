from pathlib import Path
import cv2
from PIL import Image, ImageDraw

source = Path(r'C:\Users\usEr\Downloads\original-948190befeeb9aba7b613d8fe40b99d0.mp4')
output = Path(__file__).parent
video = cv2.VideoCapture(str(source))
fps = video.get(cv2.CAP_PROP_FPS)
count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
duration = count / fps
print({'fps': fps, 'frames': count, 'duration_seconds': duration,
       'width': video.get(cv2.CAP_PROP_FRAME_WIDTH), 'height': video.get(cv2.CAP_PROP_FRAME_HEIGHT)})
sheet = Image.new('RGB', (1600, 900), '#dddfe3')
draw = ImageDraw.Draw(sheet)
for index in range(8):
    seconds = (duration - 0.1) * index / 7
    video.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000)
    success, pixels = video.read()
    if not success:
        continue
    frame = Image.fromarray(cv2.cvtColor(pixels, cv2.COLOR_BGR2RGB))
    frame.save(output / f'frame-{index:02d}.png')
    frame.thumbnail((398, 420))
    x = (index % 4) * 400 + (400 - frame.width) // 2
    y = (index // 4) * 450 + 25
    sheet.paste(frame, (x, y))
    draw.text(((index % 4) * 400 + 12, (index // 4) * 450 + 7), f'{index}: {seconds:.2f}s', fill='#152035')
sheet.save(output / 'contact-sheet.jpg')
video.release()
