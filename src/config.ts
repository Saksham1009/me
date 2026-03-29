export const SITE = {
  website: "https://sakshamdua.dev", // replace this with your deployed domain
  author: "Saksham Dua",
  profile: "https://sakshamdua.dev/",
  desc: "My personal blog where I share my thoughts, experiences, and insights on technology and software.",
  title: "Saksham Dua",
  ogImage: "og.png",
  lightAndDarkMode: true,
  postPerIndex: 10,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  showBackButton: false, // show back button in post detail
  editPost: {
    enabled: false,
    url: "https://github.com/Saksham1009/bustling-nova/edit/main/src/data/blog/",
    text: "Suggest Changes"
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "America/Vancouver", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
