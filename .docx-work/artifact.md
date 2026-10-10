# Template contract for Harborline PBL report

## Reference and evidence

- Reference: `C:\Users\battl\OneDrive\Desktop\ASE\Cruise Management and Booking System\PBL Final Documentation templet.docx`
- SHA-256 before authoring: `9BE98EEFB5DF60AD97E321E20D4713F7FBAA00AF28ADE008AB64323FA8C9C3D5`
- Render: `.docx-work/template-reference-render/page-1.png` through `page-8.png` (exported read-only from Word because the bundled DOCX renderer has no bundled LibreOffice executable; rasterized using bundled Poppler; all eight pages visually reviewed)
- Section audit: seven A4 portrait sections; no tables, no fields, no content controls, no page-number field, no non-empty header/footer text, no footnote/endnote references. Five inline PNGs: institutional logo and four unrelated sample figures/tables.
- Style evidence: `.docx-work/template-style-evidence.json`; section evidence recorded in tool output. Package-part path/size/SHA inventory: `.docx-work/template-package-inventory.json`.

## Page and style system

- A4 portrait, 8.27 x 11.69 inches.
- Sections 1-4: left/right margins 0.62 in, top 0.31 in, bottom 1.00 in. Sections 5-7: left/right 0.63 in, top 0.75 in, bottom 1.00 in.
- Seven linked sections use the existing cover/front-matter/main-body flow. Word export renders eight pages: cover, abstract, list of figures, list of tables, contents, and three sample body pages.
- The cover title is centered at 20 pt; degree/program lines are centered and bold at 14 pt; the course line is 14 pt bold red; submitter and guide text are centered. The institution logo stays at its existing 2.85 x 1.05 in position.
- Main title uses the `paper title` style at 24 pt centered. `Heading 1` and `Heading 2` carry the template's automatic numbering; retain those styles. Body uses justified `Body Text` with 6 pt after. References use the `references` style at 8 pt. Front-matter headings are centered bold. Do not add page-number furniture or change the style/theme system.
- Document defaults use Times New Roman (with SimSun for East Asian text); the theme names Calibri Light for major Latin and Calibri for minor Latin. Existing run/paragraph formatting is intentionally extensive; edit text in place and preserve paragraph properties.

## Ordered editable slots and intended mapping

1. Cover paragraphs: project title; degree/department; course name/code; up to three student name/roll-number lines; faculty guide; submission month/year. Keep university name, address, logo, and cover structure. Values not known from the repository remain unresolved until supplied by the user.
2. Abstract page: keep heading; add a concise abstract below it.
3. List of Figures page: keep heading; list the four replacement figure captions and their rendered page numbers.
4. List of Tables page: keep heading; list two replacement table captions and their rendered page numbers.
5. Table of Contents page: keep heading; add the numbered section/subsection outline with rendered page numbers.
6. Main paper title: replace the font-size instruction with the project title; remove the formatting note.
7. Introduction: replace the sample skin-cancer text with at least one page covering cruise-management context, problem, objectives, roles, scope, and prototype boundary.
8. Methodology: retain Heading 1; replace the sample subheading and paragraph with ASE/Agile iteration, requirements, architecture, implementation, access control, and evaluation method. Add subheadings using existing `Heading 2` style as needed.
9. Four figure slots (media image2-image5): replace the skin-cancer architecture, diagnostic images, charts, and comparison tables with Harborline architecture, role workflows, adaptive cycle, and implementation/integration tables. Keep the university logo (image1) unchanged and retain each image relationship and placement.
10. Experiments: replace example text with role-based use cases and the project's recorded verification evidence. Do not invent participant research or results.
11. Results: report only server-backed prototype behavior, documented test evidence, and explicit integration boundaries. Do not imply production deployment or live vessel data.
12. Conclusion and future work: summarize the local academic MVP and realistic next steps.
13. References: replace all skin-cancer sample references with the project repository's README, architecture, ASE/agile report, and test plan.

## Package preservation and fidelity gates

- Preserve page geometry, section breaks, numbering definitions, styles, theme, logo, document relationships, footer, empty footnotes/endnotes parts, custom XML, font table, web settings, and document properties unless an explicit edit slot requires change.
- Intended package changes are `word/document.xml` and existing media image2-image5 only. Preserve all other package parts byte-for-byte and verify against the recorded inventory.
- Keep the original template byte-for-byte unchanged; output to a new DOCX in the workspace root.
- After writing, export the final DOCX to a temporary PDF with Word, rasterize every page with bundled Poppler, inspect every page at original resolution, and iterate for clipping, unexpected pagination, leftover template text, wrong captions/page references, or altered layout. Confirm the original template hash remains unchanged.

## Stable slot locators and package classification

- Cover project title: `word/document.xml`, body paragraph 2, existing `Default` style and 20 pt run. Degree/program/course: body paragraphs 7-9. Authors: body paragraphs 12-14. Guide: paragraph 17. Institution logo: body paragraph 19, relationship `rId8`, media `word/media/image1.png`, 2.85 x 1.05 in. Institution/address/date: paragraphs 21-24.
- Front-matter headings: paragraphs 25 (Abstract), 26 (List of Figures), 28 (List of Tables), 29 (Table of Contents), with section properties defining their page boundaries.
- Main title and note: paragraphs 30-31. Main sections begin at paragraphs 32, 34, 38, 45, 54, and 59; sample text slots are paragraphs 33, 36, 41, 42, 48, 49, 51, 52, 55, 57, and 60-65 (paragraph indices refer to the original template before edits).
- Editable media/placement map: paragraph 37 uses `rId10` -> image2 (7.01 x 2.90 in); paragraph 42 uses `rId11` -> image3 (7.01 x 3.42 in); paragraph 49 uses `rId12` -> image4 (7.01 x 1.61 in); paragraph 51 uses `rId13` -> image5 (7.01 x 2.04 in). The four PNGs contain the sample figure/table captions in their pixels; replace those pixels with project-specific visuals at the same display aspect ratio.
- Editable package parts: `word/document.xml` for mapped text/content slots and `word/media/image2.png` through `image5.png` for mapped example art.
- Preserve-only package parts/relationships: `[Content_Types].xml`, package relationships, `word/_rels/document.xml.rels`, `word/media/image1.png`, `word/footnotes.xml`, `word/endnotes.xml`, `word/footer1.xml`, `word/theme/theme1.xml`, `word/settings.xml`, `word/numbering.xml`, `word/styles.xml`, `word/webSettings.xml`, `word/fontTable.xml`, `customXml/*`, and `docProps/*`. Their baseline hashes/sizes are in `.docx-work/template-package-inventory.json`.


Paragraph ordinals in the slot map are one-based `w:body/w:p` positions and include the initial empty paragraph. The visual pages, stable text anchors, and relationship IDs are the source of truth if an ordinal is ambiguous.
