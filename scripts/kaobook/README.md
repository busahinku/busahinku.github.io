# kaobook (vendored, unmodified)

The class behind the typeset course notes, copied from
https://github.com/fmarotta/kaobook (master, October 2026) because it is not
in TeX Live. LaTeX Project Public License 1.3c, see `LICENSE`.

kao.sty asks for Liberation Mono, which TeX Live does not ship. Rather than
edit the class, `scripts/course-notes.tex` swaps in Libertinus Mono before
loading it.
