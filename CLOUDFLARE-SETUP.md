# GitHub Pages + Cloudflare Setup Guide

This guide will help you set up Cloudflare CDN with your GitHub Pages site for better performance, caching, and a custom domain.

---

## Why Cloudflare?

| Feature | GitHub Pages Only | GitHub Pages + Cloudflare |
|---------|-------------------|---------------------------|
| CDN | Limited | Global (300+ locations) |
| Cache Control | 10 min max | Full control |
| SSL | Yes | Yes + more options |
| DDoS Protection | Basic | Advanced |
| Analytics | None | Free |
| Custom Headers | No | Yes |
| Page Rules | No | Yes |
| Minification | No | Auto HTML/CSS/JS |

---

## Prerequisites

- GitHub Pages site deployed (you have this: `busahinku.github.io`)
- A custom domain (e.g., `busahinku.com` or `bupacone.com`)
- Cloudflare account (free tier works)

---

## Step 1: Add Site to Cloudflare

1. Go to [cloudflare.com](https://cloudflare.com) and sign up/login
2. Click **"Add a Site"**
3. Enter your domain: `yourdomain.com`
4. Select **Free plan** (sufficient for personal sites)
5. Click **Continue**

---

## Step 2: Update Nameservers

Cloudflare will scan your DNS records and provide nameservers.

1. Copy the two Cloudflare nameservers:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

2. Go to your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)

3. Find **DNS Settings** or **Nameservers**

4. Replace existing nameservers with Cloudflare's

5. Wait for propagation (can take up to 24 hours, usually 1-2 hours)

---

## Step 3: Configure DNS Records

In Cloudflare Dashboard > **DNS** > **Records**, add:

### Option A: Apex Domain (`yourdomain.com`)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `busahinku.github.io` | Proxied (orange cloud) |
| CNAME | `www` | `busahinku.github.io` | Proxied (orange cloud) |

### Option B: Subdomain Only (`blog.yourdomain.com`)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `blog` | `busahinku.github.io` | Proxied (orange cloud) |

---

## Step 4: Configure GitHub Pages Custom Domain

1. Go to your repo: `github.com/busahinku/busahinku.github.io`

2. **Settings** > **Pages**

3. Under **Custom domain**, enter: `yourdomain.com`

4. Click **Save**

5. Wait for DNS check (green checkmark)

6. Enable **"Enforce HTTPS"** (after DNS propagates)

---

## Step 5: Create CNAME File

Add a `CNAME` file to your `public/` folder:

```bash
echo "yourdomain.com" > public/CNAME
```

This ensures the custom domain persists after each deploy.

---

## Step 6: Cloudflare SSL/TLS Settings

Go to **SSL/TLS** in Cloudflare:

1. **Overview** > Set encryption mode to **Full**
   - Do NOT use "Full (strict)" with GitHub Pages

2. **Edge Certificates**:
   - Always Use HTTPS: **ON**
   - Automatic HTTPS Rewrites: **ON**
   - Minimum TLS Version: **1.2**

---

## Step 7: Cloudflare Performance & Caching Settings

### Caching > Configuration

1. **Caching Level**: Standard
2. **Browser Cache TTL**: **1 year** (Cloudflare respects your headers, but caches at edge)
3. **Auto Minify** (if available): Enable HTML, CSS, JavaScript
   - Note: This may be under "Speed" or removed in newer Cloudflare UI
4. **Brotli**: Should be enabled by default

### Caching > Cache Rules (Free plan: 10 rules)

Create a rule for static assets:

**Rule 1: Cache Static Assets Aggressively**
```
If: URI Path contains "/fonts/" OR
    URI Path contains "/_astro/" OR
    URI Path ends with ".woff" OR
    URI Path ends with ".woff2" OR
    URI Path ends with ".css" OR
    URI Path ends with ".js" OR
    URI Path ends with ".jpg" OR
    URI Path ends with ".png" OR
    URI Path ends with ".svg" OR
    URI Path ends with ".webp"

Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 month
  - Browser TTL: 1 year
```

**Rule 2: Cache HTML with shorter TTL**
```
If: URI Path ends with ".html" OR
    URI Path ends with "/"

Then:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 4 hours
  - Browser TTL: 1 hour
```

---

## Step 8: Page Rules (Optional - Legacy)

If you prefer Page Rules (3 free):

**Rule 1: Cache Everything**
```
URL: yourdomain.com/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 day
```

**Rule 2: Force HTTPS**
```
URL: http://yourdomain.com/*
Settings:
  - Always Use HTTPS
```

---

## Step 9: Security Settings

### Security > Settings

1. **Security Level**: Medium
2. **Challenge Passage**: 30 minutes
3. **Browser Integrity Check**: **ON**

### Security > Bots

1. **Bot Fight Mode**: **ON** (free)

---

## Step 10: Verify Setup

### Test DNS
```bash
dig yourdomain.com +short
# Should return Cloudflare IPs (104.x.x.x or 172.x.x.x)
```

### Test Headers
```bash
curl -I https://yourdomain.com
# Look for: cf-cache-status: HIT (after first visit)
# Look for: server: cloudflare
```

### Test Performance
- https://pagespeed.web.dev/
- https://gtmetrix.com/

---

## Cloudflare Cache Status Headers

| Header Value | Meaning |
|--------------|---------|
| `HIT` | Served from Cloudflare cache |
| `MISS` | Fetched from origin (GitHub) |
| `EXPIRED` | Cache expired, refetched |
| `DYNAMIC` | Not cached (HTML by default) |
| `BYPASS` | Cache bypassed |

---

## Troubleshooting

### "Too Many Redirects" Error
- Set SSL mode to **Full** (not Full Strict)
- Disable "Always Use HTTPS" temporarily, then re-enable

### Site Not Updating After Deploy
- Cloudflare Dashboard > **Caching** > **Purge Everything**
- Or wait for cache TTL to expire

### Mixed Content Warnings
- Enable **Automatic HTTPS Rewrites** in SSL/TLS

### Custom Domain Not Working
1. Check CNAME file exists in `public/CNAME`
2. Verify DNS propagation: https://dnschecker.org/
3. Check GitHub Pages settings shows green checkmark

---

## Quick Reference Commands

```bash
# Add CNAME file
echo "yourdomain.com" > public/CNAME

# Commit and deploy
git add public/CNAME
git commit -m "Add custom domain CNAME"
git push

# Test DNS
dig yourdomain.com
nslookup yourdomain.com

# Test if Cloudflare is active
curl -I https://yourdomain.com | grep -i cloudflare
```

---

## Expected Performance After Setup

| Metric | Before (GitHub Pages) | After (+ Cloudflare) |
|--------|----------------------|----------------------|
| FCP | 2.5-3s | 1-1.5s |
| LCP | 2.5-3s | 1-1.5s |
| Cache | 10 min | 1 month+ |
| Global CDN | Limited | 300+ PoPs |

---

## Summary Checklist

- [ ] Add site to Cloudflare
- [ ] Update nameservers at registrar
- [ ] Add DNS records (CNAME)
- [ ] Set custom domain in GitHub Pages
- [ ] Create `public/CNAME` file
- [ ] Set SSL to "Full"
- [ ] Enable Auto Minify
- [ ] Configure cache rules
- [ ] Test with PageSpeed Insights
- [ ] Purge cache after major updates

---

## Useful Links

- [Cloudflare + GitHub Pages Docs](https://developers.cloudflare.com/support/third-party-software/others/configuring-cloudflare-and-github-pages/)
- [GitHub Pages Custom Domain Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- [DNS Checker](https://dnschecker.org/)
