#!/usr/bin/env python3
"""
Mineo 皮肤生图工具（Gemini + 后处理）。供 create-asset-skin / create-land-skin 技能调用。

流程：Gemini 生图（建议纯品红 #ff00ff 背景）→ 抠掉背景成透明 → 按 alpha 自动裁剪 →
可选缩放 → 存 RGBA PNG，直接进 public/skins/<id>/。

- key + 模型来自仓库根 `.imagegen.local.json`（**gitignored**）或 GEMINI_API_KEY 环境变量；
  模型默认 gemini-3.1-flash-image。
- 依赖：`pip install google-genai pillow numpy`

用法：
  # 生成 + 抠图 + 裁剪 + 缩到长边≤384
  python3 tools/gen_skin_image.py --prompt "pixel art apple tree ... pure solid magenta #ff00ff background" \
      --out public/skins/orchard/tree.png --max 384
  # 基于已有图编辑
  python3 tools/gen_skin_image.py --prompt "..." --image ref.png --out out.png
  # 只对已有图做后处理（不调 API，省额度）
  python3 tools/gen_skin_image.py --from raw.png --out out.png --max 384

要点：Gemini 输出常是带背景的 JPEG。让 prompt 明确「纯色背景（pure solid magenta
#ff00ff），无阴影」便于抠图。AI 平滑美术在 manifest 里设 `pixelated:false`（别硬缩成
小像素，否则糊）；像素风 AI 图可设 true。
"""
import argparse
import json
import os
import sys
from pathlib import Path

CONFIG = Path(__file__).resolve().parents[1] / ".imagegen.local.json"
DEFAULT_MODEL = "gemini-3.1-flash-image"


def load_cfg() -> tuple[str, str]:
    cfg = {}
    if CONFIG.exists():
        try:
            cfg = json.loads(CONFIG.read_text())
        except json.JSONDecodeError as e:
            sys.exit(f"{CONFIG} 解析失败：{e}")
    api_key = cfg.get("apiKey") or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    return api_key, cfg.get("model") or DEFAULT_MODEL


def hex_to_rgb(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def generate(prompt: str, images: list[str]):
    try:
        from google import genai
    except ImportError:
        sys.exit("缺少依赖：pip install google-genai pillow numpy")
    from PIL import Image

    api_key, model = load_cfg()
    if not api_key:
        sys.exit("缺少 API key：填 .imagegen.local.json 的 apiKey 或设 GEMINI_API_KEY。")
    client = genai.Client(api_key=api_key)
    contents: list = [prompt]
    for p in images:
        contents.append(Image.open(p))
    resp = client.models.generate_content(model=model, contents=contents)
    parts = getattr(resp, "parts", None) or resp.candidates[0].content.parts
    for part in parts:
        if getattr(part, "text", None):
            print("· model:", part.text.strip()[:200])
        elif getattr(part, "inline_data", None) is not None:
            return part.as_image()
    sys.exit("返回里没有图片（可能被安全策略拦了）。")


def postprocess(img, chroma, threshold: int, max_size: int, crop: bool):
    import numpy as np
    from PIL import Image

    a = np.array(img.convert("RGBA"))
    if chroma is not None:
        rgb = a[..., :3].astype(np.float32)
        d = np.sqrt(((rgb - np.array(chroma, dtype=np.float32)) ** 2).sum(axis=-1))
        bg = d < threshold
        a[..., 3][bg] = 0
        a[..., 0][bg] = a[..., 1][bg] = a[..., 2][bg] = 0  # 清掉透明像素颜色，避免缩放渗色
    out = Image.fromarray(a.astype("uint8"), "RGBA")
    if crop:
        box = out.getchannel("A").getbbox()
        if box:
            out = out.crop(box)
    if max_size and max(out.size) > max_size:
        s = max_size / max(out.size)
        out = out.resize((max(1, round(out.width * s)), max(1, round(out.height * s))), Image.LANCZOS)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description="Gemini 生图 + 抠图，产出皮肤透明 PNG。")
    ap.add_argument("--prompt", help="生图 prompt（与 --from 二选一）")
    ap.add_argument("--from", dest="src", help="只后处理这张已有图（不调 API）")
    ap.add_argument("--out", required=True, help="输出 PNG 路径")
    ap.add_argument("--image", action="append", default=[], help="生成时的输入参考图（可多次）")
    ap.add_argument("--chroma", default="#ff00ff", help="要抠成透明的背景色（默认品红）；none=不抠")
    ap.add_argument("--threshold", type=int, default=170, help="抠图色彩距离阈值")
    ap.add_argument("--max", type=int, default=384, help="缩放：长边像素上限（0=不缩）")
    ap.add_argument("--no-crop", action="store_true", help="不按 alpha 自动裁剪")
    args = ap.parse_args()

    from PIL import Image

    if args.src:
        img = Image.open(args.src)
    elif args.prompt:
        img = generate(args.prompt, args.image)
    else:
        sys.exit("需要 --prompt（生成）或 --from（仅后处理）。")

    chroma = None if args.chroma.lower() == "none" else hex_to_rgb(args.chroma)
    out = postprocess(img, chroma, args.threshold, args.max, not args.no_crop)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out)
    print(f"✅ saved {args.out}  ({out.width}x{out.height} RGBA)")


if __name__ == "__main__":
    main()
