const fs = require('fs');

const files = [
  'src/pages/Settings.tsx',
  'src/pages/Sales.tsx',
  'src/pages/Products.tsx',
  'src/pages/Inventory.tsx',
  'src/pages/Expenses.tsx',
  'src/pages/Customers.tsx',
  'src/pages/Dashboard.tsx',
  'src/components/ProductCatalogBrowser.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1. Add control to useForm destructuring
  content = content.replace(/const\s+\{\s*register(:[^,]+)?([^}]+)\}\s*=\s*useForm/g, (match, p1, p2) => {
    changed = true;
    const suffix = p1 ? p1.replace(':', '').trim() : '';
    const controlName = suffix ? `control: control${suffix.replace('register', '')}` : 'control';
    if (match.includes('control')) return match;
    return `const { register${p1 || ''}, ${controlName},${p2}} = useForm`;
  });

  // 2. Replace FormSelect usages
  content = content.replace(/<FormSelect([^>]+)\{\.\.\.(register[A-Za-z0-9_]*)\(\s*"([^"]+)"([^)]*)\)\s*\}([^>]*)>/g, (match, before, regFn, fieldName, rules, after) => {
    changed = true;
    const suffix = regFn.replace('register', '');
    const controlName = suffix ? `control${suffix}` : 'control';
    const isRequired = rules.includes('required:');
    const requiredProp = isRequired ? ' required ' : ' ';
    return `<FormSelect${before}name="${fieldName}" control={${controlName}}${requiredProp}${after}>`;
  });

  // Replace native <select> with <Select> from radix
  content = content.replace(/<select([^>]*value=\{([^}]+)\}[^>]*onChange=\{([^}]+)\}[^>]*)>([\s\S]*?)<\/select>/g, (match, props, val, onCh, children) => {
    changed = true;
    let cls = '';
    const clsMatch = props.match(/className=(?:"([^"]+)"|\{([^}]+)\})/);
    if (clsMatch) {
       cls = clsMatch[1] || clsMatch[2];
    }
    
    let newChildren = children.replace(/<option([^>]*)>([\s\S]*?)<\/option>/g, (optMatch, optProps, optText) => {
       let optVal = optText.trim();
       const valMatch = optProps.match(/value=(?:"([^"]+)"|\{([^}]+)\})/);
       if (valMatch) optVal = valMatch[1] || `{${valMatch[2]}}`;
       else optVal = `"${optVal}"`;
       if (optVal.startsWith('{') && optVal.endsWith('}')) {
       } else if (!optVal.startsWith('"')) {
          optVal = `"${optVal}"`;
       }
       return `<SelectItem value={${optVal}.toString()}>${optText}</SelectItem>`;
    });

    let newOnChange = onCh;
    if (onCh.includes('(e)')) {
       newOnChange = onCh.replace('(e) =>', '(val) =>').replace('e.target.value', 'val');
    } else {
       newOnChange = `(val) => {${onCh}({target:{value:val}})}`;
    }

    if (!content.includes('SelectContent')) {
       content = `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\n` + content;
    }

    return `
      <Select value={String(${val})} onValueChange={${newOnChange}}>
        <SelectTrigger className="${cls}">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          ${newChildren}
        </SelectContent>
      </Select>
    `;
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
}
