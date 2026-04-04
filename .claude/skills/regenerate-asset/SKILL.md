---
name: regenerate_asset
description: Regenerate a generative asset image using mcp__mcp-image__generate_image. Updates the asset's prompt and saves the previous prompt to promptHistory in GenerativeAssetData.ts.
---

# Regenerate Asset Skill

This skill regenerates an image for a named generative asset defined in `src/rendering/GenerativeAssetData.ts`.

## Arguments

The skill accepts the following arguments as a single string:

- **asset name** (required): The `name` field of the asset to regenerate (e.g., `player_spritesheet`, `bg_greenhill`).
- **new prompt** (optional): A replacement prompt. If not provided, reuse the existing prompt.
- **quality** (optional): `fast`, `balanced`, or `quality`. Defaults to omitting (server default).

Format: `<asset_name> [--prompt "new prompt text"] [--quality fast|balanced|quality]`

## Procedure

1. **Read `src/rendering/GenerativeAssetData.ts`** to find the asset entry matching the given name.
   - If no match is found, report the error and list available asset names.

2. **Read the asset's current image** from `public/<outputFile>` to understand the existing visual content before regenerating.

3. **Determine the new prompt**:
   - If a `--prompt` was provided, use it as the new prompt text.
   - Otherwise, reuse the existing `prompt.prompt` text unchanged.

4. **Save the current prompt to `promptHistory`**:
   - Copy the asset's current `prompt` object (including `seed` and `extraParameters` if present) and append it to the end of the `promptHistory` array.
   - Use the Edit tool to modify `src/rendering/GenerativeAssetData.ts` in place.
   - Ensure the existing `promptHistory` array is preserved.

5. **Update the asset's `prompt` field**:
   - Set `prompt.prompt` to the new prompt text.
   - Clear `prompt.seed` and `prompt.extraParameters` (they belong to the old generation).
   - Use the Edit tool to modify `src/rendering/GenerativeAssetData.ts` in place.

6. **Call `mcp__mcp-image__generate_image`** with:
   - `prompt`: The new prompt text.
   - `fileName`: The asset's `name` (e.g., `player_spritesheet`).
   - `purpose`: The asset's `purpose` field value.
   - `quality`: If specified by the user, pass it through.
   - The tool will output the generated image to a path.

7. **Copy the generated image** to `public/<outputFile>` (the asset's `outputFile` path, relative to the project root under `public/`). Use `cp` via Bash.

8. **If the generation tool returns a seed or other parameters**, update the asset's `prompt.seed` and/or `prompt.extraParameters` in `GenerativeAssetData.ts` accordingly.

9. **Read the newly generated image** to visually verify the result, and report to the user what was generated.

## Important Notes

- The `Prompt` type is defined in `src/rendering/GenerativeAsset.ts`:
  ```ts
  interface Prompt {
    prompt: string
    seed?: number
    extraParameters?: PromptParameter[]
  }
  ```
- `promptHistory` does NOT include the current prompt — it is a log of previous prompts only.
- Always preserve the exact structure of `GenerativeAssetData.ts` — use Edit, not Write, to make surgical changes.
- Asset `outputFile` paths start with `/assets/...`; the actual files live under `public/assets/...` relative to project root.
- Follow the image-generation skill's prompt best practices when crafting or enhancing prompts.
