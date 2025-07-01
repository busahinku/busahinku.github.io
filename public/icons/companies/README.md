# Company Logos Directory

## 📁 File Structure
Upload your company logos in this directory with the following naming convention:

```
public/icons/companies/
├── tech-company.png         # Your tech company logo
├── metu.png                 # METU logo (if available)
├── company-name.png         # Any other company logos
└── README.md               # This file
```

## 📋 Guidelines

### File Naming
- Use lowercase letters and hyphens
- Example: `tech-company.png`, `metu.png`, `startup-name.png`

### Image Requirements
- **Format**: PNG or SVG preferred
- **Size**: 64x64px minimum (will be displayed as 64x64px)
- **Background**: Transparent or white background recommended
- **Quality**: High resolution for crisp display

### Usage in Code
Once uploaded, update the logo placeholders in `app/about/page.tsx`:

**Replace this placeholder:**
```tsx
<div className={`text-xs font-bold ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}`}>
  Logo
</div>
```

**With this Image component:**
```tsx
<Image
  src="/icons/companies/tech-company.png"
  alt="Tech Company Logo"
  width={64}
  height={64}
  className="object-contain w-full h-full p-2"
/>
```

**Don't forget to:**
- Add `overflow-hidden` to the parent div
- Import `Image` from 'next/image' at the top of the file

## 🔄 Quick Upload Steps
1. Add your logo file to this directory
2. Update the logo path in the experience section
3. Test in development mode
4. Commit and deploy

## 📌 Current Logo Status
- [ ] Tech Company logo - needs to be uploaded
- [ ] METU logo - needs to be uploaded  
- [x] Personal Projects - uses emoji (💻) 