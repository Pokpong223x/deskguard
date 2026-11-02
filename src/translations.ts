export type Language = 'th' | 'en';
const pairs = `หยุดเตือนเมื่อวางนิ่ง|Quiet when still
นิ่ง 3 วินาทีจะหยุดเสียงและสั่น แต่ยังเฝ้าต่อ ถือให้นิ่งก็หยุดได้ ไม่ได้ตรวจตำแหน่งเดิม|After 3 seconds of stillness, sound and vibration stop while monitoring continues. Holding still also works; the original location is not detected.
ทุกการขยับ เห็นได้ชัด|Every movement, clearly
ข้อมูลตัวอย่าง|Demo data
เซนเซอร์สด|Live sensors
รอสัญญาณ|Waiting for signal
การหมุน|Rotation
ย้อนหลังประมาณ 3 วินาที|Last 3 seconds
เชื่อมต่อเพื่อดูการเคลื่อนไหว|Connect to see movement
− − เกณฑ์|− − Threshold
วินาที|seconds
ปรับเซนเซอร์|Calibrating
เฝ้าระวัง|Guard
ประวัติ|History
ตั้งค่า|Settings
โหมดตัวอย่าง|Demo mode
บนอุปกรณ์|On device
กำลังโหลดการตั้งค่า…|Loading settings…
เพื่อนตัวเล็ก ประจำโต๊ะคุณ|Your little desk companion
มีการขยับ.\\nลองเช็กดู.|Movement detected.\\nTake a look.
อยู่ตรงนี้.\\nกำลังเฝ้าอยู่.|Right here.\\nKeeping watch.
การเฝ้าหยุดลง.\\nยืนยันเพื่อจบรอบ.|Monitoring stopped.\\nVerify to end session.
วางให้นิ่ง.\\nอีกนิดเดียว.|Keep it still.\\nAlmost ready.
วางไว้.\\nสบายใจได้.|Set it down.\\nRelax.
ยืนยันตัวตนเพื่อหยุดเสียง แล้วตรวจดูมือถือของคุณ|Verify to stop the alarm, then check your phone.
ขณะนี้ไม่ได้ตรวจจับการขยับ ยืนยันตัวตนก่อนเริ่มรอบใหม่|Monitoring is inactive. Verify before starting again.
เปิดเฝ้า แล้ววางมือถือบนโต๊ะให้มั่นคง|Start monitoring and place your phone on a stable desk.
ข้อมูลจำลอง · ยังไม่ได้เฝ้ามือถือจริง|Simulated data · Not monitoring your phone
พร้อมลองบน iPhone|Ready to try on iPhone
เชื่อมต่อเซนเซอร์ก่อนเริ่ม|Connect sensors to begin
เปิดผ่าน Expo Go เพื่อใช้เซนเซอร์จริง หรือทดลองขั้นตอนบนคอมได้|Use a compatible Expo Go on your phone for real sensors, or try the demo here.
อนุญาตการเคลื่อนไหวเพื่อให้แอปตรวจจับการขยับเครื่อง|Allow motion access to detect device movement.
เชื่อมต่อเซนเซอร์|Connect sensors
ลองโหมดตัวอย่าง|Try demo
จำลองการขยับมือถือ|Simulate movement
เฝ้าต่อด้วยหน้าจอมืด|Keep watch with a dark screen
จอยังเปิดและแอปยังทำงานอยู่ หากกดล็อกเครื่อง iOS จะหยุดการเฝ้า|The screen and app stay on. Locking your iPhone stops monitoring.
เปิดหน้าจอมืด|Open dark screen
วางบนโต๊ะที่นิ่ง และลองขยับเพื่อทดสอบก่อนใช้งาน|Place on a stable desk and test movement before use.
ทุกเหตุการณ์ อยู่ตรงนี้|All events, right here
ทุกการขยับ.\\nบันทึกไว้.|Every movement.\\nRecorded.
เหตุการณ์ล่าสุด เก็บไว้ในอุปกรณ์นี้|Recent events stored on this device
ตรวจพบจริง|Device events
จากโหมดตัวอย่าง|Demo events
ทั้งหมด|All
อุปกรณ์จริง|Device
ตัวอย่าง|Demo
ยังไม่มีเหตุการณ์|No events yet
เมื่อแอปตรวจพบการขยับ|When movement is detected,
วันเวลาและค่าที่วัดได้จะปรากฏที่นี่|the time and readings will appear here.
ไปหน้าเฝ้าระวัง|Go to guard
เก็บสูงสุด 100 เหตุการณ์|Stores up to 100 events
ล้างประวัติ|Clear history
ปรับตามโต๊ะที่คุณใช้|Tune it for your desk
ปรับนิดเดียว.\\nลงตัวกว่าเดิม.|Small adjustments.\\nA better fit.
ปรับครั้งเดียว พร้อมใช้ในครั้งถัดไป|Your settings are saved for next time.
หยุดเฝ้าระวังก่อนเปลี่ยนการตั้งค่า|Stop monitoring before changing settings.
การตรวจจับ|Detection
ความไวต่อการขยับ|Motion sensitivity
ความไวสูงจะตอบสนองต่อการขยับที่เบาลง|Higher sensitivity detects smaller movements.
ต่ำ|Low
ปานกลาง|Medium
สูง|High
กรองการสะกิดสั้น ๆ และเตือนเมื่อการขยับเกินเกณฑ์ต่อเนื่อง|Filters brief bumps and alerts on sustained movement above the threshold.
การแจ้งเตือน|Alerts
เสียงเตือน|Alarm sound
เล่นเสียงเมื่อพบการเคลื่อนไหว|Play sound when movement is detected
การสั่น|Vibration
สั่นพร้อมการแจ้งเตือนบนมือถือ|Vibrate with alerts on your phone
ปิดทั้งเสียงและการสั่นอยู่ แอปจะแจ้งเตือนด้วยภาพบนหน้าจอเท่านั้น|Sound and vibration are off. Only visual alerts will appear.
เสียงแจ้งเตือนของฉัน|My alarm sound
ยืนยันตัวตนเพื่อหยุดเฝ้า|Verify to stop monitoring
ระบบของโทรศัพท์เป็นผู้ตรวจสอบใบหน้า ลายนิ้วมือ หรือรหัสเครื่อง แอปจะได้รับเพียงผลการยืนยันตัวตน|Your phone verifies your face, fingerprint or passcode. The app receives only the result.
PIN ของแอป|App PIN
ตั้ง PIN ของแอปแล้ว|App PIN is set
ยังไม่ได้ตั้ง PIN ของแอป|No app PIN set
ตั้งเพิ่มได้เพื่อใช้เป็นอีกวิธีในการหยุดเฝ้า เป็นคนละรหัสกับรหัสเครื่อง|Add an alternative way to stop monitoring. This is separate from your device passcode.
รหัส 4 หลักสำหรับ DeskGuard ใช้เมื่อการยืนยันด้วยเครื่องไม่พร้อม เป็นคนละรหัสกับรหัสเครื่อง|A separate 4-digit DeskGuard PIN for when device authentication is unavailable.
เปลี่ยน PIN ของแอป|Change app PIN
ตั้ง PIN ของแอป|Set app PIN
หน้าจอระหว่างเฝ้า|Monitoring display
จอมืดได้ แต่ต้องเปิดแอปไว้|Dark screen, app stays open
iOS ไม่รองรับการตรวจจับการขยับต่อเนื่องหลังล็อกเครื่อง ใช้ปุ่มเปิดหน้าจอมืดหลังเริ่มเฝ้าเพื่อให้แอปทำงานต่อ โดยจอไม่ได้ดับจริง|Monitoring stops when your iPhone is locked. Dark mode keeps the app running with the display on.
โหมดใช้งาน|Operating mode
เซนเซอร์อุปกรณ์จริง|Device sensors
จำลองข้อมูลเพื่อทดลองขั้นตอนของแอป|Simulated data to try the app
ใช้ Accelerometer และ Gyroscope|Uses accelerometer and gyroscope
เปลี่ยนเป็นเซนเซอร์จริง|Use device sensors
เปลี่ยนเป็นโหมดตัวอย่าง|Switch to demo
โปรเจคตรวจจับการเคลื่อนไหวด้วยเซนเซอร์|Sensor-based motion monitoring
ทำงานขณะเปิดแอป ไม่รับประกันการป้องกันการโจรกรรม|Works while open. Does not guarantee theft prevention.
ตรวจพบการเคลื่อนไหว|Movement detected
กำลังเฝ้าระวัง|Monitoring
ไม่ได้เฝ้า · รอยืนยันจบรอบ|Inactive · Verify to end session
กำลังปรับเซนเซอร์|Calibrating sensors
ยังไม่ได้เริ่มเฝ้า|Not monitoring
เปิดแอปไว้ระหว่างเฝ้า ·|Keep the app open ·
เปิดเสียงเตือน|Sound on
ปิดเสียงเตือน|Sound off
ปิด|Close
ล้างประวัติทั้งหมด?|Clear all history?
หยุดเสียงเตือน|Stop alarm
ยืนยันเพื่อจบรอบ|Verify to end session
หยุดเฝ้าระวัง|Stop monitoring
ตั้งรหัส 4 หลักสำหรับ DeskGuard โดยเฉพาะ ไม่ใช่รหัสปลดล็อกโทรศัพท์|Set a 4-digit PIN for DeskGuard, separate from your phone passcode.
ใช้การยืนยันตัวตนของโทรศัพท์เพื่อจบรอบเฝ้าระวัง|Use device authentication to end this session.
กรอก PIN ของแอป 4 หลักที่คุณตั้งไว้|Enter your 4-digit app PIN.
การยืนยันตัวตนของเครื่องยังไม่พร้อม ตรวจสอบการตั้งค่าของโทรศัพท์แล้วลองใหม่|Device authentication is unavailable. Check your phone settings and retry.
หรือใช้ PIN ของแอปที่ตั้งไว้|Or use your app PIN
PIN ของแอปปัจจุบัน|Current app PIN
PIN ใหม่ 4 หลัก|New 4-digit PIN
PIN ของแอป 4 หลัก|4-digit app PIN
ยืนยัน PIN ใหม่|Confirm new PIN
เก็บประวัติไว้|Keep history
ล้างประวัติทั้งหมด|Clear all history
บันทึก PIN|Save PIN
ยืนยัน PIN และจบรอบ|Verify PIN and end session
การเฝ้าระวังหยุดลง|Monitoring interrupted
ตรวจพบการขยับ|Movement detected
เริ่มเฝ้าระวัง|Start monitoring
ตั้ง PIN ของแอปก่อนเริ่ม|Set an app PIN to begin
ยกเลิกการเริ่ม|Cancel countdown
ยืนยันตัวตนเพื่อหยุดเตือน|Verify to stop alarm
ยืนยันตัวตนเพื่อจบรอบ|Verify to end session
กรอก PIN เป็นตัวเลข 4 หลัก|Enter a 4-digit PIN.
PIN ทั้งสองช่องไม่ตรงกัน ลองกรอกอีกครั้ง|PINs do not match. Try again.
กรอก PIN ปัจจุบันให้ครบ 4 หลัก|Enter all 4 digits of your current PIN.
บันทึกไม่ได้ ตรวจสอบ PIN ปัจจุบันแล้วลองอีกครั้ง|Could not save. Check your current PIN and retry.
PIN ไม่ถูกต้อง ลองอีกครั้ง|Incorrect PIN. Try again.
บันทึกไม่สำเร็จ ลองอีกครั้ง|Could not save. Try again.
ยืนยันตัวตนไม่สำเร็จ กรุณาลองอีกครั้ง|Authentication failed. Try again.
หน้าจอมืด · จอยังเปิดอยู่|Dark screen · Display stays on
กลับไปหน้าเฝ้าระวัง|Return to guard
โหมดตัวอย่าง · ข้อมูลจำลอง|Demo mode · Simulated data
กลับหน้าหลักแล้วยังเฝ้าต่อ|Monitoring continues on the main screen.
หากกดล็อกเครื่องหรือออกจากแอป การตรวจจับจะหยุด|Locking the phone or leaving the app stops detection.
หน้าเฝ้าระวังจะกลับเป็นหน้าจอมืดใน 15 วินาที|The dark screen returns after 15 seconds.
ป้องกันการปัดออก: เปิด Guided Access ในการตั้งค่า iPhone → การช่วยการเข้าถึง แล้วกลับมาแอป กดปุ่มด้านข้าง 3 ครั้งและเริ่มใช้งาน|To prevent leaving: enable Guided Access in iPhone Settings → Accessibility. Return here, triple-click the side button and start.
เสียงที่ใช้แจ้งเตือน|Selected alarm sound
เสียง DeskGuard|DeskGuard sound
ไฟล์นี้เล่นไม่ได้ · กำลังใช้เสียง DeskGuard|Cannot play this file · Using DeskGuard sound
เสียงจากวิดีโอ|Audio from video
ไฟล์ของคุณ|Your file
เสียงเริ่มต้นของแอป|Default app sound
จาก|From
กำลังเตรียมเสียง…|Preparing audio…
เปลี่ยนไฟล์|Change file
เลือกเสียงหรือวิดีโอ|Choose audio or video
หยุดฟัง|Stop preview
กำลังโหลดเสียง…|Loading audio…
ฟังตัวอย่าง|Preview
ใช้เสียงเริ่มต้น|Use default sound
MP3, M4A, WAV, AAC และวิดีโอ MP4 · ไม่เกิน 10 MB|MP3, M4A, WAV, AAC and MP4 video · Up to 10 MB
ใช้เฉพาะเสียงจากวิดีโอ · แยกเสียงและเก็บไว้บนอุปกรณ์นี้|Extracts audio only · Stored on this device
ฟังตัวอย่างได้สูงสุด 10 วินาที|Preview up to 10 seconds
ปิดเสียงเตือนอยู่ ไฟล์นี้จะใช้เมื่อเปิดเสียง แต่ยังกดฟังตัวอย่างได้|Alarm sound is off. You can still preview this file.
หยุดเฝ้าระวังก่อนเปลี่ยนหรือทดลองเสียง|Stop monitoring to change or preview audio.
เซนเซอร์พร้อม|Sensors ready
ยังไม่เริ่มเฝ้า|Not monitoring
มีการขยับ.\\nเช็กมือถือหน่อย.|Movement detected.\\nCheck your phone.
กำลังเฝ้า.\\nวางใจได้เลย.|Keeping watch.\\nRest easy.
วางให้นิ่ง.\\nอีกนิดก็พร้อม.|Keep it still.\\nAlmost ready.
วางมือถือ.\\nให้เราเฝ้า.|Set it down.\\nLet us watch.
ยืนยันตัวตนเพื่อหยุดการแจ้งเตือน|Verify to stop alerts
ขณะนี้ไม่ได้ตรวจจับการขยับ ยืนยันตัวตนก่อนเริ่มใหม่|Monitoring is inactive. Verify before restarting.
กำลังเตรียมตรวจจับการขยับเครื่อง|Preparing motion detection
เริ่มเฝ้าเมื่อคุณพร้อม แล้วเปิดแอปไว้|Start when ready and keep the app open.
ขยับแค่ไหน.\\nก็เห็นชัด.|See every\\nmovement.
ปรับการตรวจจับให้พอดีกับโต๊ะของคุณ|Tune detection for your desk
ตั้งค่าความไวเซนเซอร์|Adjust sensor sensitivity
บันทึกในเครื่อง|Stored locally
ทุกเหตุการณ์.\\nย้อนดูได้.|Every event.\\nReady to review.
เวลาและการขยับที่ตรวจพบ อยู่ที่นี่|Times and detected movements, all here
ดูประวัติการเฝ้าระวัง|View monitoring history
รหัสเครื่อง|Device passcode
การยืนยันของเครื่อง|Device authentication
ยืนยันด้วยเครื่อง|Device authentication
กำลังตรวจวิธียืนยันตัวตนของเครื่อง…|Checking device authentication…
ระบบของโทรศัพท์เป็นผู้ยืนยันตัวตน แอปไม่เห็นและไม่เก็บรหัสเครื่องหรือข้อมูลใบหน้า|Your phone verifies your identity. The app never sees or stores your passcode or face data.
ใช้ Face ID, Touch ID หรือรหัสเครื่องได้ในแอปบนมือถือ เว็บใช้ PIN ของ DeskGuard|Use Face ID, Touch ID or a device passcode in the mobile app. On the web, use your DeskGuard PIN.
ตั้งรหัสล็อกหน้าจอในเครื่องก่อน จึงจะใช้การยืนยันของเครื่องได้|Set a device passcode first to enable device authentication.
Expo Go ใช้รหัสเครื่องผ่านหน้าต่างของระบบได้ ส่วน Face ID ต้องติดตั้ง development build ของ DeskGuard|Expo Go supports the system passcode prompt. Face ID requires a native DeskGuard build.`;
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const dictionary = new Map(pairs.split('\n').map(line => { const [th, en] = line.split('|'); return [normalize(th.replace(/\\n/g, '\n')), en.replace(/\\n/g, '\n')]; }));
export function translate(value: string, language: Language): string {
  if (language === 'th') return value;
  const key = normalize(value);
  const exact = dictionary.get(key);
  if (exact) return exact;
  const countdown = key.match(/^เริ่มใน (\d+) วินาที$/);
  if (countdown) return `Starting in ${countdown[1]} seconds`;
  const more = key.match(/^ดูเพิ่ม \((\d+)\)$/);
  if (more) return `Show more (${more[1]})`;
  const remove = key.match(/^ลบ (\d+) เหตุการณ์ออกจากอุปกรณ์นี้ หลังลบแล้วกู้คืนไม่ได้$/);
  if (remove) return `Delete ${remove[1]} events from this device? This cannot be undone.`;
  const elapsed = key.match(/^เฝ้ามาแล้ว (.+) · เปิดแอปค้างไว้$/);
  if (elapsed) return `Monitoring for ${elapsed[1]} · Keep the app open`;
  if (key.startsWith('ความไว')) return `Sensitivity: ${translate(key.slice('ความไว'.length), language)}`;
  if (key.startsWith('ใช้ ')) return `Use ${translate(key.slice('ใช้ '.length), language)}`;
  if (key.endsWith(' หรือรหัสเครื่อง')) return `${key.slice(0, -' หรือรหัสเครื่อง'.length)} or device passcode`;
  return value;
}
