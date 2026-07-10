const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementPanel.tsx', 'utf8');

code = code.replace(/<div[^>]*>\s*<label[^>]*>البريد الإلكتروني \(اختياري\)<\/label>\s*<input[^>]*\/>\s*<\/div>/g, "");
code = code.replace(/<div[^>]*>\s*<label[^>]*>البريد الإلكتروني<\/label>\s*<input[^>]*\/>\s*<\/div>/g, "");

fs.writeFileSync('src/components/ManagementPanel.tsx', code);
