---
paths:
  - app/**/*.tsx
  - components/**/*.tsx
---

- active, hover などの pseudo class を使う場合は、`useTheme()` の戻り値を元にテーマを判別し、 `cn` で条件分岐すること。
  - これは、 UniWind のバグで、 pseudo class のスタイルがテーマに依存する場合に、正しく反映されないことがあるため。
