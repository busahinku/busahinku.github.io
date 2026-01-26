export const languages = {
  en: 'English',
  tr: 'Türkçe',
} as const;

export const defaultLang = 'en' as const;

export type Lang = keyof typeof languages;

export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.projects': 'Projects',
    'nav.courses': 'Courses',
    'nav.about': 'About',
    'nav.misc': 'Misc',
    'nav.contact': 'Contact',

    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.paper': 'Paper',

    // Home
    'home.welcome': 'Welcome',
    'home.description': 'Welcome to my personal website',
    'home.latestPosts': 'Latest Posts',
    'home.viewAll': 'View all posts',

    // Blog
    'blog.title': 'Blog',
    'blog.description': 'My thoughts and writings',
    'blog.readMore': 'Read more',
    'blog.publishedOn': 'Published on',
    'blog.updatedOn': 'Updated on',
    'blog.minRead': 'min read',
    'blog.comments': 'Comments',
    'blog.search': 'Search posts...',
    'blog.category': 'Category',
    'blog.allCategories': 'All Categories',
    'blog.year': 'Year',
    'blog.allYears': 'All Years',
    'blog.sort': 'Sort',
    'blog.sortNewest': 'Newest first',
    'blog.sortOldest': 'Oldest first',
    'blog.sortAZ': 'A-Z',
    'blog.showingPosts': 'Showing {count} posts',
    'blog.clearFilters': 'Clear filters',
    'blog.noResults': 'No posts found',
    'blog.tags': 'Tags',
    'blog.category.technology': 'Technology',
    'blog.category.tutorial': 'Tutorial',
    'blog.category.personal': 'Personal',
    'blog.category.design': 'Design',
    'blog.category.programming': 'Programming',
    'blog.category.other': 'Other',

    // Blog Post Enhanced
    'blog.contents': 'Contents',
    'blog.textSettings': 'Text Settings',

    // Firebase - Views & Likes
    'blog.views': 'views',
    'blog.likes': 'likes',

    // Firebase - Comments
    'blog.commentsTitle': 'Comments',
    'blog.signInWithGoogle': 'Sign in with Google',
    'blog.signOut': 'Sign out',
    'blog.writeComment': 'Write a comment...',
    'blog.postComment': 'Post',
    'blog.reply': 'Reply',
    'blog.edit': 'Edit',
    'blog.delete': 'Delete',
    'blog.cancel': 'Cancel',
    'blog.save': 'Save',
    'blog.edited': 'edited',
    'blog.noComments': 'Be the first to comment!',
    'blog.confirmDelete': 'Are you sure you want to delete this comment?',
    'blog.writeReply': 'Write a reply...',
    'blog.justNow': 'just now',
    'blog.minutesAgo': '{n} minute(s) ago',
    'blog.hoursAgo': '{n} hour(s) ago',
    'blog.daysAgo': '{n} day(s) ago',
    'blog.monthsAgo': '{n} month(s) ago',
    'blog.yearsAgo': '{n} year(s) ago',
    'blog.font': 'Font',
    'blog.textSize': 'Text Size',
    'blog.small': 'Small',
    'blog.large': 'Large',
    'blog.lineHeight': 'Line Height',
    'blog.width': 'Width',
    'blog.compact': 'Compact',
    'blog.normal': 'Normal',
    'blog.relaxed': 'Relaxed',
    'blog.narrow': 'Narrow',
    'blog.normalWidth': 'Normal',
    'blog.wide': 'Wide',
    'blog.clickToReveal': 'Click to reveal',
    'blog.videoError': 'Unable to load video',

    // About
    'about.title': 'About Me',
    'about.description': 'Learn more about me',

    // Projects
    'projects.title': 'Projects',
    'projects.description': 'My projects and work',
    'projects.viewProject': 'View Project',
    'projects.sourceCode': 'Source Code',
    'projects.liveDemo': 'Live Demo',
    'projects.search': 'Search projects...',
    'projects.allCategories': 'All Categories',
    'projects.allYears': 'All Years',
    'projects.noResults': 'No projects found',
    'projects.category.web': 'Web',
    'projects.category.mobile': 'Mobile',
    'projects.category.desktop': 'Desktop',
    'projects.category.api': 'API',
    'projects.category.library': 'Library',
    'projects.category.other': 'Other',

    // Courses
    'courses.title': 'Courses',
    'courses.description': 'Learning resources and tutorials',
    'courses.search': 'Search courses...',
    'courses.allCategories': 'All Categories',
    'courses.allYears': 'All Years',
    'courses.noResults': 'No courses found',
    'courses.category.programming': 'Programming',
    'courses.category.web': 'Web Development',
    'courses.category.data': 'Data Science',
    'courses.category.design': 'Design',
    'courses.category.devops': 'DevOps',
    'courses.category.other': 'Other',

    // Misc
    'misc.title': 'Misc',
    'misc.description': 'Random stuff and experiments',

    // Contact
    'contact.title': 'Contact',
    'contact.description': 'Get in touch with me',
    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.message': 'Message',
    'contact.send': 'Send Message',

    // Footer
    'footer.rights': 'All rights reserved',

    // Common
    'common.language': 'Language',
    'common.theme': 'Theme',
  },
  tr: {
    // Navigation
    'nav.home': 'Ana Sayfa',
    'nav.blog': 'Blog',
    'nav.projects': 'Projeler',
    'nav.courses': 'Kurslar',
    'nav.about': 'Hakkımda',
    'nav.misc': 'Diğer',
    'nav.contact': 'İletişim',

    // Theme
    'theme.light': 'Açık',
    'theme.dark': 'Koyu',
    'theme.paper': 'Kağıt',

    // Home
    'home.welcome': 'Hoş Geldiniz',
    'home.description': 'Kişisel web siteme hoş geldiniz',
    'home.latestPosts': 'Son Yazılar',
    'home.viewAll': 'Tüm yazıları gör',

    // Blog
    'blog.title': 'Blog',
    'blog.description': 'Düşüncelerim ve yazılarım',
    'blog.readMore': 'Devamını oku',
    'blog.publishedOn': 'Yayınlanma tarihi',
    'blog.updatedOn': 'Güncellenme tarihi',
    'blog.minRead': 'dk okuma',
    'blog.comments': 'Yorumlar',
    'blog.search': 'Yazı ara...',
    'blog.category': 'Kategori',
    'blog.allCategories': 'Tüm Kategoriler',
    'blog.year': 'Yıl',
    'blog.allYears': 'Tüm Yıllar',
    'blog.sort': 'Sırala',
    'blog.sortNewest': 'En yeni',
    'blog.sortOldest': 'En eski',
    'blog.sortAZ': 'A-Z',
    'blog.showingPosts': '{count} yazı gösteriliyor',
    'blog.clearFilters': 'Filtreleri temizle',
    'blog.noResults': 'Yazı bulunamadı',
    'blog.tags': 'Etiketler',
    'blog.category.technology': 'Teknoloji',
    'blog.category.tutorial': 'Eğitim',
    'blog.category.personal': 'Kişisel',
    'blog.category.design': 'Tasarım',
    'blog.category.programming': 'Programlama',
    'blog.category.other': 'Diğer',

    // Blog Post Enhanced
    'blog.contents': 'İçindekiler',
    'blog.textSettings': 'Metin Ayarları',

    // Firebase - Views & Likes
    'blog.views': 'görüntüleme',
    'blog.likes': 'beğeni',

    // Firebase - Comments
    'blog.commentsTitle': 'Yorumlar',
    'blog.signInWithGoogle': 'Google ile giriş yap',
    'blog.signOut': 'Çıkış yap',
    'blog.writeComment': 'Bir yorum yazın...',
    'blog.postComment': 'Gönder',
    'blog.reply': 'Yanıtla',
    'blog.edit': 'Düzenle',
    'blog.delete': 'Sil',
    'blog.cancel': 'İptal',
    'blog.save': 'Kaydet',
    'blog.edited': 'düzenlendi',
    'blog.noComments': 'İlk yorumu siz yazın!',
    'blog.confirmDelete': 'Bu yorumu silmek istediğinizden emin misiniz?',
    'blog.writeReply': 'Bir yanıt yazın...',
    'blog.justNow': 'az önce',
    'blog.minutesAgo': '{n} dakika önce',
    'blog.hoursAgo': '{n} saat önce',
    'blog.daysAgo': '{n} gün önce',
    'blog.monthsAgo': '{n} ay önce',
    'blog.yearsAgo': '{n} yıl önce',
    'blog.font': 'Yazı Tipi',
    'blog.textSize': 'Metin Boyutu',
    'blog.small': 'Küçük',
    'blog.large': 'Büyük',
    'blog.lineHeight': 'Satır Aralığı',
    'blog.width': 'Genişlik',
    'blog.compact': 'Dar',
    'blog.normal': 'Normal',
    'blog.relaxed': 'Geniş',
    'blog.narrow': 'Dar',
    'blog.normalWidth': 'Normal',
    'blog.wide': 'Geniş',
    'blog.clickToReveal': 'Görmek için tıklayın',
    'blog.videoError': 'Video yüklenemedi',

    // About
    'about.title': 'Hakkımda',
    'about.description': 'Hakkımda daha fazla bilgi',

    // Projects
    'projects.title': 'Projeler',
    'projects.description': 'Projelerim ve çalışmalarım',
    'projects.viewProject': 'Projeyi Gör',
    'projects.sourceCode': 'Kaynak Kod',
    'projects.liveDemo': 'Canlı Demo',
    'projects.search': 'Proje ara...',
    'projects.allCategories': 'Tüm Kategoriler',
    'projects.allYears': 'Tüm Yıllar',
    'projects.noResults': 'Proje bulunamadı',
    'projects.category.web': 'Web',
    'projects.category.mobile': 'Mobil',
    'projects.category.desktop': 'Masaüstü',
    'projects.category.api': 'API',
    'projects.category.library': 'Kütüphane',
    'projects.category.other': 'Diğer',

    // Courses
    'courses.title': 'Kurslar',
    'courses.description': 'Öğrenme kaynakları ve eğitimler',
    'courses.search': 'Kurs ara...',
    'courses.allCategories': 'Tüm Kategoriler',
    'courses.allYears': 'Tüm Yıllar',
    'courses.noResults': 'Kurs bulunamadı',
    'courses.category.programming': 'Programlama',
    'courses.category.web': 'Web Geliştirme',
    'courses.category.data': 'Veri Bilimi',
    'courses.category.design': 'Tasarım',
    'courses.category.devops': 'DevOps',
    'courses.category.other': 'Diğer',

    // Misc
    'misc.title': 'Diğer',
    'misc.description': 'Rastgele şeyler ve deneyler',

    // Contact
    'contact.title': 'İletişim',
    'contact.description': 'Benimle iletişime geçin',
    'contact.name': 'İsim',
    'contact.email': 'E-posta',
    'contact.message': 'Mesaj',
    'contact.send': 'Mesaj Gönder',

    // Footer
    'footer.rights': 'Tüm hakları saklıdır',

    // Common
    'common.language': 'Dil',
    'common.theme': 'Tema',
  },
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: keyof typeof translations.en): string {
    return translations[lang][key] || translations.en[key] || key;
  };
}

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Lang;
  return defaultLang;
}

export function getLocalizedPath(path: string, lang: Lang): string {
  if (lang === defaultLang) {
    return path;
  }
  return `/${lang}${path}`;
}
