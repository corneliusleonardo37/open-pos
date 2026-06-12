# Open POS Project Brief

## Ringkasan

Open POS adalah aplikasi POS standalone yang dibuat sebagai pengganti sistem POS lama berbasis Google AppScript.

Fokus awal project adalah membangun web app standalone yang stabil, mudah dikembangkan, dan memiliki fondasi data yang aman untuk transaksi penjualan serta pergerakan stok.

## Stack Awal

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Supabase PostgreSQL

## Target Pengembangan

Tahap awal Open POS adalah web app standalone.

Ke depannya, aplikasi ini harus tetap memungkinkan untuk dikembangkan menjadi:

- PWA
- Aplikasi Windows
- Aplikasi Android

## Role Pengguna

### Owner

Owner memiliki akses penuh untuk mengelola data bisnis, user, produk, stok, laporan, dan audit aktivitas.

### Kasir

Kasir memiliki akses terbatas untuk menjalankan operasional penjualan dan melihat informasi yang diperlukan untuk transaksi harian.

## MVP Awal

Fitur MVP awal Open POS:

- Login
- Dashboard
- Produk
- Barang masuk
- Penjualan kasir
- Laporan sederhana
- Audit log
- User management

## Prinsip Pengembangan

- Jangan membuat fitur besar sekaligus.
- Setiap fitur harus kecil, bisa dites, dan tidak merusak fitur sebelumnya.
- Jangan hardcode data bisnis.
- Jangan membuat folder nested tambahan.
- Prioritaskan struktur data dan keamanan transaksi stok.

## Prioritas Teknis

- Rancang struktur data dengan hati-hati sebelum membangun UI besar.
- Pastikan setiap perubahan stok berasal dari transaksi yang tercatat.
- Hindari update stok langsung tanpa jejak audit.
- Pisahkan hak akses Owner dan Kasir sejak awal.
- Gunakan validasi input di sisi client dan server.
- Gunakan transaksi database untuk operasi yang mengubah stok.
- Simpan audit log untuk aksi penting seperti login, perubahan produk, barang masuk, penjualan, perubahan stok, dan manajemen user.

## Batasan Saat Ini

Project ini belum membangun fitur POS.

Fokus saat ini adalah menjaga fondasi project tetap bersih, siap dikembangkan, dan mudah diuji secara bertahap.
