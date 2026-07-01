# TikTok 红色标签视频逐帧动作 Prompts

整理时间：2026-06-28

范围：`/Users/cathug/Documents/ai舞蹈生成器/模版收集/代表视频/表格50条/TikTok` 中带 Finder 红色标签的视频，共 10 条。

使用口径：下面每条 prompt 不再写粗略舞蹈风格词，而是按视频抽样关键帧拆解动作。使用时请把对应原视频作为 motion reference / pose reference / video-to-video 输入；prompt 用来强制模型关注肢体位置、动作衔接、重心变化和节奏律动。

说明：这里的“逐帧”是适合 prompt 使用的关键帧拆解，每条约 12 个时间点。真正 30fps 的逐视频帧复刻应使用 OpenPose / skeleton / motion track JSON，不适合直接塞进自然语言 prompt。

通用负面约束：

```text
no celebrity likeness, no minors, no logos, no watermark, no extra people, no extra dancers, no crowd, no explicit movement, no body close-up, no distorted limbs, no extra fingers, keep one solo dancer full body visible
```

## 09 - Passinho do Jamal Solo Groove

- 文件：`09_TikTok_trio maravilha 🕺_7634285108861701409_#passinhodojamal🇧🇷 #fyp.mp4`
- 复刻对象：只复刻前排领舞，删除其他出镜者。

```text
Use the source video as the motion reference. Generate one solo dancer only. Do not summarize the dance style. Recreate the body positions and transitions below.

F01 1.2s: dancer faces camera, feet under hips, knees soft, torso upright, both arms relaxed low beside the body, weight centered.
Transition to F02: start a small downward knee bounce; right shoulder drops slightly before the right arm moves.
F02 3.0s: right forearm swings low across the front of the waist; left arm stays loose; chest turns a few degrees toward the moving arm.
Transition to F03: rebound up through the knees; right hand travels diagonally upward from waist to chest.
F03 4.8s: right hand/forearm crosses the upper chest; left hand remains low; shoulders pulse once; head stays facing camera.
Transition to F04: right elbow leads upward; wrist follows with a small delay.
F04 6.6s: right hand flicks near the mouth/cheek; elbow bent; left arm counters low; knees continue tiny pulses.
Transition to F05: hand drops from face to chest; body shifts weight to the opposite foot.
F05 8.3s: one hand taps or brushes the chest; the other arm hangs low; torso leans a little toward the tapping side.
Transition to F06: both elbows draw inward; wrists cross last.
F06 10.1s: both forearms form an X in front of the chest; elbows rounded; knees dip at the same moment.
Transition to F07: uncross the arms outward; shoulders pop as the arms open.
F07 11.9s: right forearm opens across the body; left hand low; chest returns to center; head nods lightly.
Transition to F08: lift the hand toward the face again while keeping the feet pulsing in place.
F08 13.6s: hand passes in front of mouth/cheek; opposite shoulder dips; body stays compact.
Transition to F09: drop the hand to the chest and switch weight side-to-side.
F09 15.4s: repeat chest brush with a small shoulder bounce; elbows remain close to ribs.
Transition to F10: pull one fist upward near the shoulder; knees rebound upward.
F10 17.2s: fist or bent hand near shoulder/neck height; other arm low; torso angled slightly to one side.
Transition to F11: push the bent arm forward across the body; head follows half a beat later.
F11 19.0s: forearm extends forward/across chest level; feet keep a small in-place bounce.
Transition to F12: dancer leans closer to camera and compresses the final arm accent.
F12 20.7s: dancer is slightly closer to camera; arm crosses high near the chest/shoulder; final beat lands with a head nod.

Interpolation rule: connect every frame with visible knee rebound. Chest brush must flow into forearm X; forearm X must open into face flick; face flick must drop into chest brush. Do not invent large steps or new hand gestures.
```

## 13 - Night Terrace Passinho Solo

- 文件：`13_TikTok_⠀ ⠀ ⠀ ⠀ ⠀ ⠀_7627666533770120466_#passinhodojamal #fyp @Levy.mp4`
- 复刻对象：只复刻前排舞者，删除后排舞者。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the exact limb positions, small steps, and rebound between frames.

F01 1.2s: dancer steps into frame, torso angled slightly left, arms hanging low, knees bent softly.
Transition to F02: feet settle under the body; both arms begin to open outward from the sides.
F02 2.8s: arms open low and slightly away from the torso; shoulders relaxed; knees pulse twice.
Transition to F03: elbows lift first, then hands rise toward the head.
F03 4.5s: both hands near forehead/top of head, elbows forward and up, knees still bouncing.
Transition to F04: hands drop from head to chest; forearms rotate inward.
F04 6.1s: forearms cross or slice in front of chest; one hand travels down toward the waist; weight shifts to one leg.
Transition to F05: one arm opens outward while the other stays bent near waist.
F05 7.8s: right/lead arm extends outward at shoulder level; opposite hand near hip; torso leans into the extended arm.
Transition to F06: both hands lift to shoulder height; elbows stay bent.
F06 9.4s: both hands hover beside shoulders; elbows open; dancer bounces vertically in place.
Transition to F07: elbows close inward; forearms begin a chest-level rolling motion.
F07 11.1s: forearms roll horizontally in front of chest; hands close to the sternum; feet make a tiny forward-back step.
Transition to F08: rolling hands pull inward; shoulders pulse up-down.
F08 12.8s: fists or bent hands near chest/shoulders; knees dip; torso remains upright.
Transition to F09: one hand drops to hip while the other arm lifts diagonally.
F09 14.4s: one hand on or near hip; other arm raised with elbow bent; body weight on one side.
Transition to F10: raised arm folds down; both forearms return to chest level.
F10 16.1s: both forearms parallel in front of torso, making a compact horizontal roll; feet remain planted.
Transition to F11: dancer steps slightly closer to camera; arms continue small rolling pattern.
F11 17.7s: body has moved forward; hands still active near chest; head stays facing camera.
Transition to F12: hands close together near the centerline; shoulders bounce into final accent.
F12 19.4s: hands meet or pass close in front of chest; knees land the final pulse.

Interpolation rule: every hand lift must pass through the elbows first. Arm slices should be sharp on the beat, then soften into the next roll. Forward/back steps stay tiny; do not add big traveling movement.
```

## 15 - No Hands Body Groove

- 文件：`15_TikTok_Cadel_7607814547319131400_NO HANDS DANCE 🤷‍♂️ dc_ @rivernovin.mp4`
- 复刻对象：只复刻前排舞者，删除其他出镜者。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the body-driven movement; arms are secondary and should not become hand choreography.

F01 0.9s: dancer walks forward into position, torso upright, arms relaxed, feet stepping naturally.
Transition to F02: settle into the beat; knees bend and the lead arm starts to lift as a body accent.
F02 2.1s: one arm bent upward near shoulder/head height, opposite hand near hip; knees bounce; torso still tall.
Transition to F03: drop quickly through knees; torso folds forward and sideways.
F03 3.3s: deep squat, torso pitched forward, one arm arched overhead, head lowered; feet wide.
Transition to F04: continue lowering; shoulders and head swing downward.
F04 4.5s: very low crouch, head and hair/body angled down, one hand near thigh/waist; knees deeply bent.
Transition to F05: push through one foot and lean sideways; one arm extends as counterbalance.
F05 5.7s: side lean with one arm reaching outward, torso diagonal, legs still wide and bent.
Transition to F06: rotate chest upward/backward while maintaining the squat.
F06 6.9s: wide squat with torso arched back/side, head tilted, one hand close to hip, body weight heavy in the legs.
Transition to F07: rebound up from the squat; shoulders roll forward.
F07 8.1s: dancer rises to a medium-low level, arms bent, shoulders rolling, knees still pulsing.
Transition to F08: chest lifts and arms open slightly; feet stay grounded.
F08 9.3s: upright bounce, arms opening outward as simple shapes, torso centered.
Transition to F09: step or shift to one side; body leans into the next accent.
F09 10.5s: side step with knees bent, one shoulder dropped, arms loose and low.
Transition to F10: torso swings upward/back; one arm follows the arc.
F10 11.7s: torso leans back or diagonally up, one arm lifted, opposite leg grounded.
Transition to F11: return to center with both arms briefly lifting as the knees rebound.
F11 12.9s: centered bounce, both arms raised/opened, chest lifted.
Transition to F12: fold down from the chest through the spine; knees compress.
F12 14.1s: dancer folds forward/down, arms low, knees bent; final beat lands low.

Interpolation rule: feet and knees lead every transition. Low crouch must connect to side lean through weight transfer, not a jump. Shoulders and head arrive slightly after hips and knees. Keep arms relaxed and subordinate to torso motion.
```

## 17 - Easy Brazilian Solo Groove

- 文件：`17_TikTok_valentino_7620142882883767565_this brazilian dance is too addicting🔥🔥🇧🇷 #fyp #br.mp4`
- 复刻对象：单人原视频。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the compact hand, shoulder, chest, and foot timing.

F01 0.9s: dancer faces camera; one hand near ear/side of head, other arm low; torso leans slightly; knees soft.
Transition to F02: hand drops from ear; body returns to center with a small bounce.
F02 2.1s: arms low, shoulders relaxed, feet under hips, body centered.
Transition to F03: both forearms begin small upward motions toward the chest.
F03 3.2s: hands active near chest/upper waist, elbows bent; shoulders pulse.
Transition to F04: one forearm sweeps across the torso; weight shifts to the opposite foot.
F04 4.4s: compact cross-body arm gesture at chest height; chest turns slightly.
Transition to F05: arm travels downward and across the waist; knees dip.
F05 5.6s: right/lead forearm crosses low in front of torso; opposite arm relaxed; head still forward.
Transition to F06: repeat the low sweep with a small shoulder pop.
F06 6.7s: forearm remains across body, wrist loose; body bounces in place.
Transition to F07: both arms draw inward toward a crossing shape.
F07 7.9s: arms compact across the front, hands near midline; knees compress.
Transition to F08: hands rebound outward slightly; chest pops.
F08 9.0s: hands close together near chest/upper waist; shoulders lifted in a small pulse.
Transition to F09: torso leans forward; one arm drops low.
F09 10.2s: forward lean, one arm low across the waist, head slightly lowered.
Transition to F10: lift head and one hand upward as if pointing or accenting above.
F10 11.3s: head angled upward/side; one hand lifted; torso taller.
Transition to F11: hand drops; both arms cross low in front of the body.
F11 12.5s: arms crossed or brushing low near waist; knees bounce.
Transition to F12: compact the arms higher toward the chest for final accent.
F12 13.7s: arms close to chest, body leaning slightly forward, small head nod.

Interpolation rule: each cross-body hand path should drag the shoulder and chest with it. Do not add large footwork. Keep continuous small knee bounce between all frames.
```

## 18 - Like A Reflex Floor Transition

- 文件：`18_TikTok_darley_boo_7616778423398124822_like a reflex _ dc_ @meigamind #dancechallenge #da.mp4`
- 复刻对象：单人原视频。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the floor path frame by frame; level changes and weight transfer are the priority.

F01 1.1s: dancer walks toward low camera, upright posture, arms relaxed, feet stepping forward.
Transition to F02: slow the walk; prepare knees and hips for a downward drop.
F02 2.7s: dancer standing closer to camera, body centered, arms low, knees beginning to bend.
Transition to F03: bend knees deeply; one hand starts reaching toward the floor.
F03 4.3s: dancer drops into kneeling or low crouch, one knee near floor, one hand moving down.
Transition to F04: continue momentum into a side fall/slide; head and hair follow the drop.
F04 5.9s: body low on floor, torso turned sideways, one hand supporting, head/hair moving across frame.
Transition to F05: extend one leg outward; prop torso with one arm.
F05 7.5s: side-supported seated/leaning shape, one leg extended, one hand on floor, torso diagonal.
Transition to F06: rotate chest toward floor; both hands prepare to support body weight.
F06 9.1s: body extended through hands, torso almost horizontal, legs trailing; weight on hands/feet.
Transition to F07: draw knees underneath; lift hips into tabletop.
F07 10.7s: tabletop/all-fours shape, both hands on floor, knees bent, back arched.
Transition to F08: ripple spine downward and forward; head follows.
F08 12.2s: low tabletop with deeper back curve, head lower, one hip shifted.
Transition to F09: lower torso to floor through shoulder and chest.
F09 13.8s: body partially on floor, knees bent, torso turned, one arm supporting.
Transition to F10: roll onto back/side; hands come toward chest or floor for support.
F10 15.4s: dancer lies low on floor, torso facing upward/side, knees bent.
Transition to F11: lift legs upward while shoulders stay near floor.
F11 17.0s: legs lift vertically or diagonally upward, hips on floor, arms stabilizing.
Transition to F12: lower legs and press hands into floor to return toward tabletop.
F12 18.6s: body pushes back up to hand-supported crouch/tabletop, head lifting into final accent.

Interpolation rule: never jump between standing, kneeling, tabletop, and floor. The motion must pass through visible contact points: feet to knees, knees to hands, hands to tabletop, tabletop to shoulder/back roll, back roll to leg lift, leg lift to hand press-up.
```

## 19 - RED RED Studio Solo

- 文件：`19_TikTok_CLEO_7633009886237871381_RED RED! #cortis #dance #redred.mp4`
- 复刻对象：单人原视频。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the exact angular arm hits, wide foot positions, body drops, and rebounds.

F01 1.2s: dancer near low camera, one arm lifted high, one leg stepping, body angled.
Transition to F02: step back to center; arms lower to prepare.
F02 2.8s: dancer centered, feet apart, arms low, torso upright.
Transition to F03: raise hands toward face/chest while knees dip.
F03 4.4s: hands close to face or upper chest, elbows bent forward, body low.
Transition to F04: open both arms upward and outward; feet widen.
F04 6.1s: wide stance, both arms lifted/bent near head height, elbows open.
Transition to F05: sink deeper through knees; arms stay lifted as shoulders pulse.
F05 7.7s: widest stance, knees bent, both arms up in a strong angular shape.
Transition to F06: arms drop; weight shifts to one side.
F06 9.3s: side step or side lean, arms low/loose, torso angled.
Transition to F07: sweep one arm diagonally while stepping through.
F07 11.0s: diagonal body lean, one arm extended or cutting across, opposite leg crossing/stepping.
Transition to F08: lift one arm upward into a point while torso rebounds.
F08 12.6s: one arm points high, other arm down, feet apart, body stretched upward.
Transition to F09: drop arm and settle into wide stance.
F09 14.2s: centered wide stance, arms low, knees bent.
Transition to F10: raise elbows beside head/shoulders.
F10 15.8s: both elbows lifted, hands near head height, chest forward.
Transition to F11: shift weight and lift one knee; arm counters the leg.
F11 17.5s: one knee lifted or foot kicked back, one arm active near chest, torso tilted.
Transition to F12: land back wide; arms return low.
F12 19.1s: centered stance, arms lowered, final grounded bounce.

Interpolation rule: every sharp arm hit must rebound through bent knees. Low camera perspective must remain; feet stay wide and heavy. Do not smooth out the angular hand shapes.
```

## 20 - Like That Casual Solo

- 文件：`20_TikTok_kendalls.kloset_7602821791832100127_like that dance #fyp #viral #trending #blowthisup.mp4`
- 复刻对象：只保留前排单人，删除最后出现的其他人。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the small conversational hand gestures and soft body bounce.

F01 1.0s: dancer stands facing camera, arms low, feet planted, shoulders relaxed.
Transition to F02: elbows bend; hands rise toward chest with palms opening.
F02 2.4s: both palms open upward in front of chest, elbows close to body, slight bounce.
Transition to F03: palms rotate outward and separate.
F03 3.8s: hands open wider, palms visible, chest subtly forward.
Transition to F04: both hands travel downward toward the waist.
F04 5.1s: hands meet or cross low in front of waist; knees dip softly.
Transition to F05: low hand brush continues across the front of the body.
F05 6.5s: both hands brush low near hips/waist, elbows bent, weight centered.
Transition to F06: one hand rises toward shoulder/chest.
F06 7.9s: one fist or hand near chest/shoulder height, other arm low, small head nod.
Transition to F07: torso turns side; head and hair follow.
F07 9.2s: body turned side profile, hair/head moving, one hand near head/neck.
Transition to F08: rotate back to camera; forearms cross at chest level.
F08 10.6s: forearms roll or cross in front of chest, elbows close.
Transition to F09: arms drop low again; weight returns center.
F09 12.0s: hands low near thighs/waist, body slightly forward.
Transition to F10: one hand lifts toward face.
F10 13.3s: one hand points or flicks near face; eyes forward; shoulders bounce.
Transition to F11: both hands open outward.
F11 14.7s: palms open outward at chest height, elbows bent, torso upright.
Transition to F12: repeat outward palm opening and keep frame solo.
F12 16.1s: final open-palms phrase, one solo dancer only, no other people entering frame.

Interpolation rule: hand gestures must travel through elbows and wrists, not teleport. Keep a small knee bounce under every gesture. Side turn must unwind back into chest-level arm roll.
```

## 24 - REDRED Rooftop Solo

- 文件：`24_TikTok_karina_7652314456814439700_redred #fyp #dance @vika.mp4`
- 复刻对象：只复刻前排舞者，删除后排舞者。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the exact low-camera body positions and arm geometry.

F01 0.9s: dancer close to low camera, legs prominent, body stepping backward into frame.
Transition to F02: continue stepping back until full body is centered.
F02 2.1s: dancer stands centered, feet apart, arms low, torso upright.
Transition to F03: elbows lift and forearms cross at chest level.
F03 3.3s: strong forearm X-cross in front of chest, knees bent, head slightly down.
Transition to F04: open elbows upward and outward while staying low.
F04 4.5s: both elbows raised beside shoulders/head, hands loose, wide stance bounce.
Transition to F05: close arms back into an X-cross.
F05 5.7s: second forearm X-cross, body lower, torso angled slightly.
Transition to F06: open hands upward beside face.
F06 6.9s: hands up near face/shoulders, elbows bent, knees pulsing.
Transition to F07: step to side; one knee lifts slightly as arms change.
F07 8.1s: side step or knee lift, one foot off or light, arms angled across body.
Transition to F08: land back into stance; arms reset low.
F08 9.3s: dancer upright, arms lower, feet apart.
Transition to F09: drop body downward and forward through knees.
F09 10.5s: low body drop, head down, hands near front of body.
Transition to F10: arms sweep upward/diagonal as torso rises.
F10 11.7s: arms lifted diagonally across/above body, torso rising.
Transition to F11: arms sweep across body to the side.
F11 12.9s: side arm sweep, body turned slightly, feet still wide.
Transition to F12: settle back to neutral stance.
F12 14.1s: dancer centered, arms low, final relaxed but grounded position.

Interpolation rule: X-cross opens through elbows; side step is led by knee and hip; body drop rebounds into diagonal arm sweep. Keep low camera and full body visible.
```

## 31 - Bambole Clean Hip-Sway Groove

- 文件：`31_TikTok_kelly_3_7649057888572411168_this is so much fun to dance to😭 #bambole #viral #.mp4`
- 复刻对象：单人原视频。保持安全、非性感化，不做身体局部特写。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the back-facing stance, arm positions, knee pulses, and weight shifts without close-up framing.

F01 0.9s: dancer faces camera, arms bent low with small wrist accents, feet under hips.
Transition to F02: turn body to face away from camera; arms begin opening.
F02 1.9s: back-facing turn in progress, one shoulder leading, arms opening outward.
Transition to F03: finish facing away; both arms extend fully to the sides.
F03 3.0s: back to camera, arms straight out horizontally, feet beginning to widen.
Transition to F04: elbows bend slightly; knees pulse.
F04 4.0s: back-facing, arms bent/open, hips shift to one side.
Transition to F05: hands travel up to back of head; elbows open.
F05 5.0s: both hands behind head, elbows wide, feet planted wide, knees bent.
Transition to F06: hips shift side-to-side through the knees.
F06 6.1s: hip shifted to one side, shoulders counterbalance, hands remain behind head.
Transition to F07: pass hips through center to opposite side.
F07 7.1s: hip shifted to opposite side, knees pulse, elbows remain open.
Transition to F08: repeat the side pulse at the same body level.
F08 8.2s: wide stance, hands behind head, hips pulsing side-to-side.
Transition to F09: lean torso and hips further to one side.
F09 9.2s: stronger side lean, one hip high, one knee more bent.
Transition to F10: reverse the lean to the other side.
F10 10.3s: opposite side lean, shoulders tilt, elbows stay wide.
Transition to F11: roll shoulders and send a gentle wave down the spine.
F11 11.3s: body wave through shoulders/back, hips still shifting.
Transition to F12: settle into final side sway.
F12 12.4s: final back-facing sway, hands behind head, wide stance, knees pulsing.

Interpolation rule: each hip shift must pass through center; knees create constant cushion. Arms extend before hands go behind head. Do not add camera zoom or body close-up.
```

## 32 - Let Me Drive Rooftop Solo

- 文件：`32_TikTok_𝖓𝖊𝖘𝖘🇧🇷 • IG_@08.ness_7649088026018303265_LET ME DRIVE #DANCE #mario #trend #viral #foryou @.mp4`
- 复刻对象：只复刻前排/主舞者，删除其他出镜者。

```text
Use the source video as the motion reference. Generate one solo dancer only. Recreate the short hook exactly with low stance, step timing, arm swing, hand pull, and side pulses.

F01 0.6s: dancer stands upright facing camera, feet under hips, arms low.
Transition to F02: step-touch begins; one knee prepares to lift.
F02 1.2s: one knee lifts lightly, arms close to torso, body bounces upward.
Transition to F03: lifted foot lands; torso returns center.
F03 1.9s: dancer centered again, feet closer together, arms low.
Transition to F04: opposite knee or same knee lifts into the next beat.
F04 2.5s: knee lift with small bounce, torso upright, arms relaxed low.
Transition to F05: step laterally to open stance.
F05 3.2s: lateral step outward, one foot traveling, arms beginning low swing.
Transition to F06: feet slide wider; knees bend.
F06 3.8s: stance wider, body lower, arms hanging ready for low swing.
Transition to F07: drop into squat while arms swing across front.
F07 4.4s: wide squat begins, knees bent, arms low in front of body.
Transition to F08: pull hands inward as body sinks lower.
F08 5.1s: deep squat, hands pulling inward near waist/hips, torso forward.
Transition to F09: pulse to one side without rising.
F09 5.7s: very wide low stance, weight shifted to one side, arms low.
Transition to F10: shift weight to opposite side, staying low.
F10 6.4s: low side pulse to opposite side, knees deeply bent.
Transition to F11: repeat low pulse and arm swing.
F11 7.0s: low stance, arms swing or pull again, torso still forward.
Transition to F12: hold final low bounce.
F12 7.7s: final wide squat bounce, arms low, full body visible, no other people.

Interpolation rule: step-touch flows into knee lift; knee lift lands into lateral slide; lateral slide opens into wide squat; arm swing pulls into hand-pull accent; side pulses stay low and never rise fully upright between beats.
```

