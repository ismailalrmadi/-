const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const loginRegex = /\} else if \(loginPhone === 'admin' && loginPassword === 'admin'\) \{/;
code = code.replace(loginRegex, 
`} else if (loginPhone === 'admin' && loginPassword === 'admin' || (loginPhone === '0500000001' && loginPassword === '123' && users.length === 0)) {`);

fs.writeFileSync('src/App.tsx', code);
