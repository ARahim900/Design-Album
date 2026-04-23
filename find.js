import fs from 'fs';
import path from 'path';

function findImages(dir) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (!['node_modules', '.git', 'sys', 'proc', 'dev', 'run', 'var'].includes(file)) {
                    findImages(fullPath);
                }
            } else {
                if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
                    console.log(fullPath);
                }
            }
        }
    } catch (e) {}
}

findImages('/tmp');
findImages('/home');
findImages('/workspace');
findImages('/');
