const fs = require('fs');

function repl(file, search, replace) {
  let c = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, c.replace(search, replace), 'utf8');
}

// dashboard/page.tsx
repl('apps/web/src/app/dashboard/page.tsx', />\$<\/span>/g, '>₹</span>');
repl('apps/web/src/app/dashboard/page.tsx', /\+\$\{income/g, '+₹${income');
repl('apps/web/src/app/dashboard/page.tsx', /\-\$\{expense/g, '-₹${expense');
repl('apps/web/src/app/dashboard/page.tsx', /\}\$\{tx\.amount/g, '}₹${tx.amount');

// history/page.tsx
repl('apps/web/src/app/dashboard/history/page.tsx', /\}\$\{tx\.amount/g, '}₹${tx.amount');

// analytics/page.tsx
repl('apps/web/src/app/dashboard/analytics/page.tsx', />\$\{totalIncome/g, '>₹${totalIncome');
repl('apps/web/src/app/dashboard/analytics/page.tsx', />\$\{totalExpense/g, '>₹${totalExpense');
repl('apps/web/src/app/dashboard/analytics/page.tsx', /\`\$\$\{val/g, '`₹${val');
repl('apps/web/src/app/dashboard/analytics/page.tsx', /\`\$\$\{value/g, '`₹${value');
repl('apps/web/src/app/dashboard/analytics/page.tsx', />\$\{entry\.value/g, '>₹${entry.value');

// add/page.tsx
repl('apps/web/src/app/dashboard/add/page.tsx', />\$<\/span>/g, '>₹</span>');
