---
title: metuans.tech development process
description: A collection of my notes and thoughts on the development process of metuans.tech.
date: '01-01-2025'
tags: ['NextJS', 'Python', 'JavaScript', 'TypeScript', 'TailwindCSS', 'ShadcnUI', 'Firebase', 'Vercel']
mainPhoto: 'https://mir-s3-cdn-cf.behance.net/project_modules/max_632/52997f219345373.67b08b292a41e.png'
demoUrl: 'https://metuans.tech'
githubUrl: 'https://private-for-a-while'
type: "web-app"
---

## Why Does This Site Exist?

"metuans" is a web application that significantly simplifies course selection for METU students. Let's rewind a bit to understand the context. Unlike some other universities, METU does not provide students with a predefined weekly schedule. Each department takes courses from various other departments, and these courses are not necessarily opened by the student's own department. This interdepartmental collaboration is essential. In contrast, universities like Hacettepe do not follow this model. Because of this unique structure at METU, students must find the appropriate sections and create their schedules manually. This is where metuans.tech comes into play.

Before diving into the technical aspects, let's compare metuans with its competitors.

## Comparison with Alternatives

metuans is not the only application providing this service. The two well-known alternatives are **tetick.xyz** and **robotdegilim.xyz**. There are several reasons why metuans was created despite these open-source projects:

- **Modern UI:** metuans uses Tailwind CSS and a modern UI/UX approach.
- **Responsive Design:** Unlike **robotdegilim.xyz**, which misplaces courses on mobile schedules, metuans correctly arranges all courses in their respective time slots. All features are fully responsive.
- **Wallpaper Export:** This is the main selling point of metuans. Many students want to use their schedules as wallpapers on their phones, tablets, or computers. metuans allows users to export their schedules with various predefined themes. Some available themes include: Ana de Armas, Lando Norris, Hamilton, Şenol Güneş, Sally Ferrero, Lightning McQueen, and Messi.
- **Year Check:** Both **robotdegilim.xyz** and **tetick.xyz** fail to check the required academic year for a course. This often results in students seeing sections they cannot enroll in. metuans strictly enforces this rule; for example, a 4th-semester student cannot select a course that requires a 3rd-year prerequisite.
- **Elective Courses:** Neither of the competing applications provides elective course options. metuans includes both **restricted electives** and **non-technical electives**. After adding mandatory courses, students can use the "Add Elective" button to find elective courses that fit into their schedule.
- **Modern Schedule UI:** metuans claims to have the best schedule UI among all Turkish scheduling apps. To support this claim, a survey was conducted with 43 students from different universities. metuans.tech (beta) was the top choice, with 29 preferences.
- **Data Standardization:** Different instructors enter course information in different formats. For example, a course with five sections may have the first section listed as five hours long, while the rest are two hours. This is technically incorrect, but due to laziness, instructors often omit shared lecture hours. metuans standardizes this data, fixing inconsistencies. Additionally, some departments follow unique methods, such as the **Mathematics Department**, which assigns recitation sections automatically based on lecture sections. metuans accurately reflects these assignments, whereas competing applications assume all sections are independent.

For these reasons, METU students have many compelling reasons to choose metuans over its alternatives.

## Why Isn't This Application Open-Source?

The developers of competing applications have already graduated, and their websites publicly display school data. At this point, no action can be taken against them. However, I still have **two years** left until graduation :D. metuans.tech uses a vastly different data-fetching method compared to its competitors and requires significantly more data to operate and improve future features.

While alternative projects store around **50,000** rows of data, metuans.tech holds **500,000** raw data rows before even presenting it to users (**10x more**). To ensure data security, metuans employs three measures:
1. **Restricting External Access:** metuans allows access only from the **METU network IPs** (METU VPN and METU Campus Network).
2. **Disabling Caching:** This security measure increases schedule generation time from **0.1 seconds to 2 seconds** but prevents unauthorized access.
3. **No Public GitHub Repository:** The project is deployed directly on **Vercel**, making it impractical to share the repository. However, a **clone repository** will be created in the near future, with scripts and data removed, to make the core application open-source.

## Development Process

- **Branding and UI/UX Design:** Fully designed by me in **Figma**.
- **Data Collection:** Implemented using **Python scripts** with **Selenium** and **BeautifulSoup4**.
- **Frontend Development:** The web application was largely built using **AI-powered code editors** like Cursor. Except for major errors, I didn't need much research, as AI has improved significantly. Three years ago, I would have needed a **month** to complete this project, but now I finished it in **seven days**. Additionally, data security was preserved.
- **Ongoing Fixes:** Some minor issues still exist, which I will address in my free time.