<div align="center">
  <img src="docs/public/logo.svg" alt="OpenMedia" width="96" />
  <h1>OpenMedia</h1>
  <p>Tải video từ hầu hết mọi trang web. Công cụ tải media gọn nhẹ, tự lưu trữ, với giao diện web rõ ràng.</p>
  <p>
    <a href="https://github.com/ttncode/openmedia/actions/workflows/ci.yml"><img src="https://github.com/ttncode/openmedia/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/ttncode/openmedia/releases"><img src="https://img.shields.io/github/v/release/ttncode/openmedia?color=12939c" alt="Release" /></a>
    <a href="https://github.com/ttncode/openmedia/stargazers"><img src="https://img.shields.io/github/stars/ttncode/openmedia?style=flat&color=12939c" alt="Stars" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-12939c" alt="MIT license" /></a>
  </p>
  <p><a href="README.md">English</a> | Tiếng Việt</p>
</div>

## Tính năng

- Tải từ hơn 1000 trang web thông qua yt-dlp
- Video MP4 và MKV với bộ chọn chất lượng
- Âm thanh MP3, M4A, Opus, FLAC và WAV
- Cắt theo khoảng thời gian
- Phụ đề, nhúng vào video hoặc tách riêng dưới dạng SRT
- Nhúng ảnh bìa, metadata và chương vào tệp
- Hàng đợi hiển thị tiến độ trực tiếp, có thể hủy và giới hạn số lượng tải cùng lúc
- Dán nhiều liên kết cùng lúc và tải playlist
- Cookie cho video giới hạn độ tuổi hoặc bị chặn kiểm tra bot
- Mật khẩu tùy chọn, giới hạn tốc độ yêu cầu và chặn địa chỉ mạng nội bộ
- Lịch sử, kéo thả, dán bất kỳ đâu, phím tắt
- Cài đặt được như một PWA với share target
- Giao diện sáng và tối với bảy màu nhấn
- Tiếng Anh và tiếng Việt

<div align="center">
  <img src="docs/public/screenshots/desktop-light.png" alt="OpenMedia trên desktop, giao diện sáng" width="70%" />
  <img src="docs/public/screenshots/phone-dark.png" alt="OpenMedia trên điện thoại, giao diện tối" width="20%" />
</div>

## Cài đặt

### Docker Compose

Tải `compose.yaml` và `example.env` từ
[bản phát hành mới nhất](https://github.com/ttncode/openmedia/releases/latest), sau đó:

```bash
cp example.env .env
docker compose up -d
```

Mở `http://localhost:8080`.

### Script cài đặt

```bash
curl -fsSL https://github.com/ttncode/openmedia/releases/latest/download/install.sh | bash
```

### Từ mã nguồn

```bash
git clone https://github.com/ttncode/openmedia.git
cd openmedia
mise install
mise run //apps/api:dev
mise run //apps/web:dev
```

Mở `http://localhost:3000`.

## Tài liệu

- [Bắt đầu](docs/getting-started.md)
- [Sử dụng](docs/usage.md)
- [Cấu hình](docs/configuration.md)
- [Triển khai](docs/deployment.md)
- [Xử lý sự cố](docs/troubleshooting.md)
- [Bảo mật](docs/security.md)

## Dành cho lập trình viên

Mỗi thư mục gốc cấu hình (`apps/api`, `apps/web`, `docs`) trả lời cùng một hợp
đồng tác vụ: `install`, `format`/`format-fix`, `lint`, `check`, `test`,
`build`, `ci-unit`, `checklist`. Chạy kiểm tra của một thư mục bằng `mise run
//apps/api:ci-unit`, hoặc `mise run checklist` từ thư mục gốc dự án để chạy
tất cả, đúng như những gì CI thực hiện.

| Đường dẫn  | Nội dung                       |
| ---------- | ------------------------------ |
| `apps/api` | Backend Flask, tích hợp yt-dlp |
| `apps/web` | Giao diện web Next.js          |
| `docs`     | Trang tài liệu này             |

Xem [CONTRIBUTING.md](CONTRIBUTING.md) để biết quy ước nhánh và commit.

## Cần trợ giúp

- [Hướng dẫn xử lý sự cố](docs/troubleshooting.md)
- [Báo cáo vấn đề](https://github.com/ttncode/openmedia/issues)
- [Chính sách bảo mật](SECURITY.md)

## Lời cảm ơn

- [ReClip](https://github.com/averygan/reclip), dự án mà OpenMedia được xây dựng dựa trên
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [FFmpeg](https://ffmpeg.org)
- [Deno](https://deno.com)
- [Next.js](https://nextjs.org)
- [Flask](https://flask.palletsprojects.com)
- [Phosphor Icons](https://phosphoricons.com)
- Bộ công cụ [scaffold](https://github.com/ttncode/scaffold) đã tạo dự án này

## Miễn trừ trách nhiệm

OpenMedia dành cho mục đích cá nhân. Hãy tôn trọng luật bản quyền và điều
khoản dịch vụ của các trang bạn tải xuống.

## Giấy phép

MIT, xem [LICENSE](LICENSE) và [NOTICE](NOTICE).
