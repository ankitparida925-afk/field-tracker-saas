import os
import glob

replacements = {
    'indigo-': 'amber-',
    'violet-': 'orange-',
    'blue-': 'yellow-',
    '#06080f': '#0f0a06',
    '#090d16': '#120c08',
    '#0f1729': '#140d0a',
    'slate-': 'stone-',
}

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.css', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")
