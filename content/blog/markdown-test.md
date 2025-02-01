---
title: "Complete Markdown Features Test"
description: "A comprehensive test of all available markdown features in our blog system"
date: "2024-03-14 15:30"
tags: ["markdown", "test", "documentation"]
mainPhoto: "/images/markdown.jpg"
---

## Table of Contents

## Basic Markdown Features

This is a **bold text** and this is an *italic text*. You can also use ~~strikethrough~~ text.

Here's a [link to Google](https://google.com) and here's some `inline code`.

### Lists

Unordered list:
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

Ordered list:
1. First step
2. Second step
   1. Sub-step one
   2. Sub-step two
3. Third step

### Code Blocks

Here's a JavaScript code block:

```javascript
function calculateSum(a, b) {
  return a + b;  // Returns the sum
}

// Test the function
console.log(calculateSum(5, 3));  // Output: 8
```

And here's some Python code:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Generate first 5 Fibonacci numbers
[fibonacci(i) for i in range(5)]
```

## Special Features

### Callouts

>[!note] - hello
> This is a note callout. It's useful for highlighting important information.
> hello

>[!warning] Alo
> Be careful with this section! This is a warning callout.
> aaa
aaa


>[!important]
> This is a critical piece of information that shouldn't be missed

>[!tip]
> Here's a helpful tip that might make your life easier.
> aaaa


### Mathematical Formulas

You can write inline math like this: $E = mc^2$ or create block equations:

$$
\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y_i})^2
$$

### Concept Checks

Let's test our understanding:

?[What is the primary purpose of markdown?](Markdown is a lightweight markup language designed to format text using simple and readable syntax. It's widely used for documentation and content creation.)

?[How do you create a code block in markdown?](You can create a code block by either indenting the code with 4 spaces or wrapping it in triple backticks (```). Using triple backticks also allows you to specify the programming language for syntax highlighting.)

### Tables

| Feature | Syntax | Description |
|---------|--------|-------------|
| Bold | `**text**` | Makes text bold |
| Italic | `*text*` | Makes text italic |
| Code | `` `code` `` | Creates inline code |
| Link | `[text](url)` | Creates a hyperlink |

### Blockquotes

> This is a blockquote. It's great for highlighting quotes or important passages.
> 
> You can have multiple paragraphs in a blockquote.
>
> - You can even use other markdown features inside
> - Like lists and **bold text**

### Images

Here's an example image with a caption:

![A beautiful sunset over mountains](/images/sunset.jpg)

## Emoji Support

You can use emoji shortcodes :smile: :rocket: :books:

---

## Advanced Formatting

### Nested Lists with Complex Content

1. First major point
   - Supporting detail with `inline code`
   - Another detail with a [link](https://example.com)
   2. Sub-point with **bold text**
      - Even deeper nesting
      - With multiple items
2. Second major point
   > With a blockquote
   >
   > And multiple paragraphs

### Mixed Content Blocks

[!important]
Here's an important note that contains:
- A list item
- Some `inline code`
- And a math formula: $f(x) = x^2$

?[Can you combine different markdown features in a single block?](Yes! As demonstrated above, you can mix and match various markdown features to create rich, interactive content. Just make sure to maintain proper formatting and structure.)

---

That's all! This post demonstrates every markdown feature available in our blog system. Feel free to use this as a reference when writing your own posts. 