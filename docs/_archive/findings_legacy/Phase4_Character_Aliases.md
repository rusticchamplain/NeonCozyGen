## Phase 4 - Character Alias Refresh

Summary:
- Removed all existing `char::` aliases from `data/aliases.json`.
- Added eight new pre-built character aliases with 6–8 verified tags focused on appearance, outfit, and accessories only.
- Added ten more high-variance character aliases using verified appearance/outfit/accessory tags only.
- Added ten more feminine-leaning, high-variance character aliases using verified appearance/outfit/accessory tags only.
- Renamed character aliases to start with intentional subcategory prefixes (the first word) for clearer grouping.
- Alias display/friendly names continue to be derived by the UI (`formatAliasFriendlyName`), because `data/aliases.json` only stores tag strings.

New character aliases:
- `char::futuristic_chrome_sentinel` → grey_hair, short_hair, blue_eyes, armor, cape, gauntlets, boots
- `char::urban_neon_rider` → black_hair, short_hair, red_eyes, leather_jacket, cargo_pants, fingerless_gloves, goggles, boots
- `char::formal_velvet_orchid` → pink_hair, wavy_hair, green_eyes, dress, lace, choker, earrings, high_heels
- `char::martial_storm_tactician` → white_hair, ponytail, yellow_eyes, trench_coat, scarf, gloves, boots
- `char::academic_ink_scholar` → black_hair, long_hair, blunt_bangs, glasses, turtleneck, blazer, pleated_skirt, loafers
- `char::futuristic_cobalt_pilot` → blue_hair, short_hair, grey_eyes, bomber_jacket, jumpsuit, gloves, goggles, boots
- `char::martial_ember_fencer` → red_hair, medium_hair, brown_eyes, sleeveless, arm_guards, sash, hakama, katana
- `char::mystic_veil_oracle` → purple_hair, long_hair, red_eyes, hood, cloak, mask, gloves, boots
- `char::industrial_saffron_mechanist` → brown_hair, short_hair, brown_eyes, overalls, gloves, goggles, belt
- `char::mystic_lunar_herald` → white_hair, long_hair, blue_eyes, cloak, hood, brooch, gloves
- `char::military_amber_brigade` → blonde_hair, braid, green_eyes, military_uniform, beret, gloves, boots
- `char::performer_lotus_acrobat` → green_hair, twintails, yellow_eyes, leotard, arm_warmers, thighhighs, hair_ribbon
- `char::noir_analyst` → black_hair, long_hair, grey_eyes, suit, dress_shirt, necktie, glasses
- `char::ceremonial_aurora_shrine` → blue_hair, hime_cut, blue_eyes, kimono, obi, hairpin, sandals
- `char::adventurer_opal_nomad` → grey_hair, braid, grey_eyes, cloak, scarf, belt, boots
- `char::academic_citrine_scribe` → brown_hair, medium_hair, brown_eyes, cardigan, turtleneck, long_skirt, necklace
- `char::martial_prism_samurai` → black_hair, ponytail, brown_eyes, kimono, hakama, obi, katana
- `char::adventurer_ivory_corsair` → white_hair, short_hair, red_eyes, eyepatch, coat, gloves, boots
- `char::ceremonial_sari_mirage` → black_hair, long_hair, brown_eyes, sari, bindi, bangle, earrings
- `char::formal_rose_lolita` → blonde_hair, drill_hair, blue_eyes, dress, frills, puffy_sleeves, bonnet, mary_janes
- `char::ceremonial_hanbok_silverleaf` → black_hair, long_hair, brown_eyes, hanbok, ribbon, hair_ornament, sandals
- `char::formal_masquerade_violet` → purple_hair, wavy_hair, red_eyes, half_mask, dress, gloves, choker, earrings
- `char::performer_ballet_blossom` → pink_hair, hair_bun, green_eyes, leotard, tutu, ballet_slippers, ribbon
- `char::angelic_seraph_glimmer` → white_hair, long_hair, blue_eyes, white_dress, halo, feathered_wings, tiara
- `char::gothic_nightrose` → black_hair, long_hair, purple_eyes, corset, lace, choker, thighhighs, boots
- `char::urban_neon_kitten` → aqua_hair, short_hair, yellow_eyes, cat_ears, hoodie, shorts, sneakers, hairclip
- `char::mystic_fae_butterfly` → green_hair, long_hair, green_eyes, dress, bare_shoulders, butterfly_wings, hair_flower
- `char::academic_apothecary_satin` → orange_hair, short_hair, blue_eyes, lab_coat, dress_shirt, pencil_skirt, glasses

Files touched:
- `data/aliases.json`
