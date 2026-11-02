# DeskGuard 1.0.1

วันที่ตรวจ: 2 พฤศจิกายน 2026 (Asia/Bangkok)

## สิ่งที่เปลี่ยน

- ป้องกันการเริ่มรอบเฝ้าระวังระหว่างบันทึกข้อมูลหรือกำลังตรวจ/เปลี่ยน PIN โดยตรวจสถานะทันทีใน hook ไม่ขึ้นกับความเร็วการ render ปุ่ม
- ตรวจสถานะ idle และ foreground ซ้ำก่อนเขียน PIN ที่อยู่ในคิว
- คิวเขียนข้อมูลยังทำงานต่อได้เมื่อบางรายการบันทึกล้มเหลว และไม่ให้รายการเหตุการณ์ที่เขียนช้าย้อนกลับมาหลังล้างประวัติ
- เพิ่มตัวเปิดเว็บด้วย Node.js โดยไม่ใช้แพ็กเกจเพิ่ม จำกัดการฟังที่ localhost และป้องกันการอ่านไฟล์นอกโฟลเดอร์เว็บ
- เพิ่ม `npm run verify`, `npm run preview`, output directory แยกเว็บ/iOS และ GitHub Actions ตรวจ build
- workflow สร้าง unsigned IPA ตรวจโค้ดก่อน compile และเพิ่ม version/build number เป็น 1.0.1 / 2
- อัปเดต lockfile ด้วย `npm audit fix` ภายในขอบเขต dependency เดิม

## ขอบเขตรุ่น

เว็บเป็นตัวอย่างการใช้งานบนคอมพิวเตอร์ ใช้ข้อมูลจำลองเมื่อผู้ใช้เลือกโหมดตัวอย่าง ส่วนเซนเซอร์จริงและการยืนยันด้วยเครื่องอยู่ในแอป native

การ build/export ที่ผ่านไม่ทดแทนการตรวจ accelerometer, gyroscope, ลำโพง, การสั่น, Face ID/Touch ID, การสลับแอป และการนำเข้าเสียงผ่าน Files บนโทรศัพท์จริง ออกจากแอปหรือล็อกจอแล้วการตรวจจับจะหยุด ไม่ใช่บริการเฝ้าระวังเบื้องหลัง

การ export iOS ไม่ใช่ IPA ที่ติดตั้งได้ ส่วน workflow `sideload` สร้าง IPA ไม่เซ็น ซึ่งต้องเซ็นด้วย Sideloadly ก่อนติดตั้ง

## Native IPA — สร้างสำเร็จ 2 พฤศจิกายน 2026

- EAS build [359c7a8a-fbcd-47a6-afb7-1e402e73ec25](https://expo.dev/accounts/ppmb/projects/deskguard/builds/359c7a8a-fbcd-47a6-afb7-1e402e73ec25) สถานะ FINISHED; Xcode Release รายงาน BUILD SUCCEEDED
- ตรวจโควตาก่อนเริ่ม: Free plan ใช้ iOS 1/15 ครั้ง ไม่มี add-on และยอดส่วนเกินประมาณการ 0 ใช้เพิ่ม 1 build ในรอบนี้
- เครื่อง build ตรวจ TypeScript และ tests ผ่าน 43/43 ก่อน native compilation
- ไฟล์ `DeskGuard-1.0.1-unsigned.ipa` ขนาด 9,798,831 bytes สำหรับ iPhone ARM64, iOS 16.4 ขึ้นไป, version 1.0.1 build 2, bundle ID `com.deskguard.studentapp`
- ตรวจ SHA-256 ตรงกับเครื่อง build และตรวจ CRC ทุกไฟล์ใน IPA ผ่าน ตรวจ Info.plist ว่ามีสิทธิ์ Motion และ Face ID และมี `main.jsbundle` ฝังอยู่ 2,388,459 bytes จึงไม่ต้องเชื่อม Metro ระหว่างใช้แอปที่ติดตั้งแล้ว
- SHA-256: `f38e5216e33ad4b8f22755851cf7e06e12b50d325a10d2628ed29d13f7555b67`
- ต้องเซ็นและติดตั้งด้วย Sideloadly ก่อนใช้ ไม่ใช่ไฟล์ติดตั้งผ่าน Safari และยังไม่ได้ตรวจการติดตั้ง/เซนเซอร์/เสียง/Face ID บนโทรศัพท์จริง

## Dependency audit

หลัง `npm audit fix` ยังมีรายงาน 13 รายการ (2 low, 9 moderate, 2 high) ผ่านชุดเครื่องมือ Expo รวมถึง zod 3, glob, minimatch และ deepmerge การแก้ที่ npm เสนอบางส่วนต้องเปลี่ยน Expo SDK แบบ major จึงยังไม่บังคับอัปเกรดหรือ override ข้าม major โดยไม่ได้ตรวจความเข้ากันได้ รายงานนี้ไม่ควรถูกตีความว่ารุ่นผ่าน security audit ทั้งหมด

## ผลตรวจรุ่นนี้

- `npm run verify`: TypeScript ผ่าน และ tests ผ่าน 43/43
- `expo install --check`: dependency ตรงกับ SDK
- `npm run export:web`: สร้างเว็บสำเร็จ
- `npm run export:ios`: สร้าง Hermes bundle สำเร็จ ไม่ใช่ native compile หรือ IPA
- ทดสอบเว็บจากไฟล์ที่ export ผ่านตัวเปิดเว็บของรุ่นนี้: ตั้ง PIN, ปฏิเสธ PIN ยืนยันไม่ตรง, countdown → armed → จำลองการขยับ → alarm → ปฏิเสธ PIN ผิด → จบรอบด้วย PIN ถูก
- หลัง reload ยังมี PIN และเหตุการณ์จำลองในประวัติ โหมดอุปกรณ์บนเว็บปฏิเสธการเริ่มเมื่อเซนเซอร์ไม่พร้อม
- Console error ของ browser ว่างขณะตรวจ
- ข้อมูลที่สร้างระหว่างทดสอบอยู่เฉพาะ browser ที่ใช้ตรวจ (PIN ตัวอย่าง `1234` และเหตุการณ์จำลอง 1 รายการ) ไม่ได้ฝังใน source หรือไฟล์เว็บที่แจก ผู้ใช้เปิดใน browser ใหม่ต้องตั้ง PIN เอง
- ไม่ได้ตรวจ Files picker/custom audio, authentication native หรือฮาร์ดแวร์ในรอบนี้

`VERIFICATION.md` เป็นบันทึกของรุ่นก่อนหน้า ไม่ใช่ผลทดสอบเครื่องจริงของรุ่นนี้
