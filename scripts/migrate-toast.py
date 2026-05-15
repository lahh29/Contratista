"""
One-shot migration: toast({ title, description, variant: "destructive" }) → toastError(title, description)

Strategy:
- Tokenize each `toast({ ... })` call with `variant: "destructive"` inside.
- Extract `title:` and `description:` values (allow string literals, template literals, or identifiers).
- If extraction is unambiguous and no extra keys (action, duration, etc.), rewrite to toastError(title, description).
- Otherwise, leave the call alone (printed to stderr for manual review).
- Add `import { toastError } from "@/lib/toast-helpers"` if rewrites happened and import not yet present.
"""

import re
import sys
import pathlib

ROOT = pathlib.Path(r"C:/Users/Capacitacion - QRO/Desktop/Capacitación/Contratista/src")

TARGETS = [
    "app/register/page.tsx",
    "app/(dashboard)/reports/page.tsx",
    "app/(dashboard)/fumadores/page.tsx",
    "components/settings/MealSchedulesManager.tsx",
    "components/settings/UserManager.tsx",
    "components/contractors/ContractorForm.tsx",
    "components/admin/VisitWizard.tsx",
    "app/(dashboard)/scanner/page.tsx",
    "app/(dashboard)/bajas/page.tsx",
    "components/settings/CollectionManager.tsx",
    "components/settings/AreaManager.tsx",
    "components/fumadores/JsonImporterSheet.tsx",
    "components/fumadores/EditEmployeeDialog.tsx",
    "components/fumadores/CreateEmployeeDialog.tsx",
    "components/portal/EditProfileSheet.tsx",
    "components/FirebaseErrorListener.tsx",
]


def find_matching_brace(s: str, start: int) -> int:
    """Given index of '{', return index of matching '}'."""
    depth = 0
    in_str = None
    in_template = False
    template_depth = 0
    i = start
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif in_template:
            if c == "\\":
                i += 2
                continue
            if c == "`" and template_depth == 0:
                in_template = False
            elif c == "$" and i + 1 < len(s) and s[i + 1] == "{":
                template_depth += 1
                i += 2
                continue
            elif c == "}" and template_depth > 0:
                template_depth -= 1
        else:
            if c in "\"'":
                in_str = c
            elif c == "`":
                in_template = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


# Match a value: string literal, template literal, or identifier/expression up to next top-level comma or }.
def split_top_level_keys(body: str):
    """Return list of (key, value_text) at top level of a single object body."""
    keys = []
    i = 0
    n = len(body)
    while i < n:
        # skip whitespace
        while i < n and body[i] in " \t\r\n":
            i += 1
        if i >= n:
            break
        # read key
        m = re.match(r"([A-Za-z_$][\w$]*)\s*:", body[i:])
        if not m:
            return None  # spread or unsupported
        key = m.group(1)
        i += m.end()
        # skip ws
        while i < n and body[i] in " \t\r\n":
            i += 1
        # read value until top-level comma or end
        depth_p, depth_b, depth_c = 0, 0, 0
        in_str = None
        in_tpl = 0
        start = i
        while i < n:
            c = body[i]
            if in_str:
                if c == "\\":
                    i += 2
                    continue
                if c == in_str:
                    in_str = None
            elif in_tpl > 0:
                if c == "\\":
                    i += 2
                    continue
                if c == "`":
                    in_tpl -= 1
                elif c == "$" and i + 1 < n and body[i + 1] == "{":
                    depth_b += 1
                    i += 2
                    continue
            else:
                if c in "\"'":
                    in_str = c
                elif c == "`":
                    in_tpl += 1
                elif c == "(":
                    depth_p += 1
                elif c == ")":
                    depth_p -= 1
                elif c == "{":
                    depth_b += 1
                elif c == "}":
                    depth_b -= 1
                elif c == "[":
                    depth_c += 1
                elif c == "]":
                    depth_c -= 1
                elif c == "," and depth_p == 0 and depth_b == 0 and depth_c == 0:
                    break
            i += 1
        value = body[start:i].rstrip(", \t\r\n")
        keys.append((key, value))
        # consume trailing comma
        if i < n and body[i] == ",":
            i += 1
    return keys


def migrate_file(path: pathlib.Path) -> int:
    src = path.read_text(encoding="utf-8")
    out_parts = []
    last = 0
    rewrites = 0
    skipped = []

    # find every `toast(` call
    for m in re.finditer(r"\btoast\s*\(\s*\{", src):
        call_start = m.start()
        brace_open = m.end() - 1  # position of '{'
        brace_close = find_matching_brace(src, brace_open)
        if brace_close < 0:
            continue
        # skip optional whitespace + ')' after
        j = brace_close + 1
        while j < len(src) and src[j] in " \t\r\n":
            j += 1
        if j >= len(src) or src[j] != ")":
            continue
        call_end = j + 1

        body = src[brace_open + 1: brace_close]
        keys = split_top_level_keys(body)
        if keys is None:
            skipped.append((call_start, "unsupported syntax (spread?)"))
            continue
        kmap = dict(keys)
        if kmap.get("variant", "").strip() not in ('"destructive"', "'destructive'"):
            continue

        # Only rewrite if keys are exactly subset of {title, description, variant}
        allowed = {"title", "description", "variant"}
        extra = set(kmap.keys()) - allowed
        if extra:
            skipped.append((call_start, f"extra keys: {extra}"))
            continue
        if "title" not in kmap:
            skipped.append((call_start, "no title"))
            continue

        title = kmap["title"].strip()
        desc = kmap.get("description", "").strip()

        new_call = f"toastError({title}{', ' + desc if desc else ''})"
        out_parts.append(src[last:call_start])
        out_parts.append(new_call)
        last = call_end
        rewrites += 1

    if rewrites == 0:
        for off, why in skipped:
            line = src[:off].count("\n") + 1
            print(f"  SKIP {path.name}:{line} {why}")
        return 0

    out_parts.append(src[last:])
    new_src = "".join(out_parts)

    # Add import for toastError if missing
    if "from \"@/lib/toast-helpers\"" not in new_src and "from '@/lib/toast-helpers'" not in new_src:
        # insert after the last `import` line
        import_lines = list(re.finditer(r"^import .*?;?\s*$", new_src, re.MULTILINE))
        if import_lines:
            last_imp_end = import_lines[-1].end()
            new_src = (
                new_src[:last_imp_end]
                + "\nimport { toastError } from \"@/lib/toast-helpers\""
                + new_src[last_imp_end:]
            )
    else:
        # extend existing helpers import if it doesn't already include toastError
        m = re.search(r"import\s*\{([^}]*)\}\s*from\s*[\"']@/lib/toast-helpers[\"']", new_src)
        if m and "toastError" not in m.group(1):
            new_inner = m.group(1).rstrip().rstrip(",") + ", toastError"
            new_src = new_src[: m.start(1)] + " " + new_inner.strip() + " " + new_src[m.end(1):]

    path.write_text(new_src, encoding="utf-8", newline="\n")
    print(f"  {path.name}: {rewrites} rewrite(s)")
    for off, why in skipped:
        line = new_src[:off].count("\n") + 1 if off < len(new_src) else "?"
        print(f"    SKIP at line~{line} {why}")
    return rewrites


total = 0
for rel in TARGETS:
    p = ROOT / rel
    if not p.exists():
        print(f"missing: {rel}")
        continue
    total += migrate_file(p)
print(f"\nTotal rewrites: {total}")
