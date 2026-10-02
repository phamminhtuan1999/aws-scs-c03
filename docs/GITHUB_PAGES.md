# Đưa web luyện thi lên GitHub Pages

Repo phải lấy **scs-c03-trainer làm thư mục gốc**: ngay trong repo có `app/`, `data/`, `research/` và `.github/`.
Không lấy thư mục `aws/` bên ngoài làm repo. Không cần đưa HTML gốc, bộ PDF hoặc `output/` vào repo này.

Workflow `.github/workflows/pages.yml` đã chuẩn bị sẵn: push lên `main` → cài dependency → chạy unit/UI test → build và kiểm tra hash 35 hình → deploy `app/dist`.
Không cần commit `node_modules`, `dist` hoặc `app/public/data`; GitHub tạo lại khi build. Không cần tự tạo branch `gh-pages`.

## Lần đầu

1. Đăng nhập GitHub, chọn **New repository**, đặt tên ví dụ `aws-scs-c03`.
2. Tạo repo trống, không chọn thêm README, .gitignore hoặc license vì folder này đã có dữ liệu.
3. Với tài khoản GitHub Free, dùng repo Public để triển khai Pages. Website sẽ được truy cập công khai; dữ liệu câu hỏi, đáp án và hình ảnh được tải xuống trình duyệt. Tiến độ luyện thi được lưu riêng trong trình duyệt, không được đưa lên GitHub.
4. Mở PowerShell và chạy phần dưới. Thay `YOUR_USERNAME` và `YOUR_REPO` bằng thông tin của mày; đừng chạy nguyên placeholder.

```powershell
cd 'C:\Users\Tuan\Downloads\aws\scs-c03-trainer'
git branch -M main
git add .
git commit -m "Publish SCS-C03 practice trainer"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Lần push đầu, Git Credential Manager có thể mở trang đăng nhập GitHub. Đăng nhập trong trình duyệt; không nhập mật khẩu hoặc token vào file của dự án.
Nếu commit báo thiếu tên/email, thiết lập tên và email commit ở riêng repo rồi chạy lại commit:

```powershell
git config user.name "YOUR_COMMIT_NAME"
git config user.email "YOUR_GITHUB_COMMIT_EMAIL"
```

5. Vào repo GitHub → **Settings → Pages → Build and deployment → Source → GitHub Actions**.
6. Vào **Actions → Deploy trainer to GitHub Pages**. Nếu lần chạy đầu thất bại do chưa bật Pages, chọn **Run workflow** sau bước 5.
7. Khi job deploy xanh, mở URL được hiển thị trong **Settings → Pages** hoặc environment **github-pages**. Với repo thường, URL là `https://YOUR_USERNAME.github.io/YOUR_REPO/`; nếu repo tên `YOUR_USERNAME.github.io`, URL ở gốc domain.

App dùng `base: './'`, các file data/hình có đường dẫn tương đối và điều hướng bằng hash `#`. Cấu hình này chạy ở cả `/YOUR_REPO/` và gốc domain; không cần sửa tên repo trong code.
Giữ dấu `/` cuối đường dẫn repo khi mở web. Các màn hình trong app có dạng `.../YOUR_REPO/#...` nên refresh không cần rewrite server.

## Mỗi lần cập nhật

Chạy từ thư mục `scs-c03-trainer`:

```powershell
git add .
git commit -m "Update practice trainer"
git push
```

GitHub tự chạy lại workflow. Nếu test hoặc build thất bại, bản đang được phát hành giữ nguyên và lỗi xuất hiện trong tab Actions.

Tiến độ ở localhost không tự chuyển sang domain github.io. Dùng Export progress trên web cũ rồi Import progress trên web mới để giữ lịch sử.

Tài liệu chính thức: [GitHub Pages với custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [triển khai Vite lên GitHub Pages](https://vite.dev/guide/static-deploy.html).
