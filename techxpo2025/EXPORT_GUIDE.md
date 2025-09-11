# Hướng dẫn Export Slides từ PowerPoint

## 📋 Các bước thực hiện:

### Phương pháp 1: Export từ PowerPoint (Khuyên dùng)
1. **Mở file PowerPoint**
   - Mở `TECHXPO BÁN KẾT.pptx`

2. **Export slides**
   - File → Export → Change File Type → PNG
   - Hoặc File → Save As → Change file type to PNG
   - Chọn "All Slides"

3. **Lưu file**
   - Chọn thư mục: `d:\Website\digifactWebsite.github.io\techxpo2025\slides\`
   - Tên file: `slide_01.png`, `slide_02.png`, etc.

### Phương pháp 2: Sử dụng Google Slides
1. Upload PowerPoint lên Google Drive
2. Mở bằng Google Slides
3. File → Download → PNG image (.png)
4. Extract và rename files theo format `slide_XX.png`

### Phương pháp 3: Online Converter
1. Sử dụng tool online như `smallpdf.com` hoặc `ilovepdf.com`
2. Convert PowerPoint to Images
3. Download và đặt trong thư mục `slides/`

## 📁 Cấu trúc thư mục cần có:
```
techxpo2025/
├── slides/
│   ├── slide_01.png
│   ├── slide_02.png
│   ├── slide_03.png
│   └── ...
├── chuanbipitchingbanket.html
└── TECHXPO BÁN KẾT.pptx
```

## 🔧 Kiểm tra hoạt động:
1. Mở `chuanbipitchingbanket.html` trong browser
2. Presentation sẽ tự động detect slides trong thư mục `slides/`
3. Nếu không có slides, sẽ fallback sang content slides

## 📐 Khuyến nghị:
- **Độ phân giải**: 1920x1080 (Full HD)
- **Format**: PNG (quality tốt hơn JPG)
- **Naming**: slide_01.png, slide_02.png, ... (2 chữ số)

## 🚀 Sau khi export:
Presentation sẽ tự động:
1. ✅ Kiểm tra slides trong thư mục `slides/`
2. ✅ Hiển thị slides thực từ PowerPoint
3. ✅ Navigation với keyboard/mouse/touch
4. ✅ Fullscreen mode
5. ✅ Responsive design
