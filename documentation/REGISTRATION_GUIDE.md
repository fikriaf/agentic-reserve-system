# 🎯 Colosseum Registration - Step by Step

## ✅ What's Ready

Saya telah membuat semua yang Anda butuhkan untuk registrasi:

### 📁 Files Created:
1. **scripts/register-agent.sh** - Register agent PERTAMA KALI
2. **scripts/register-ars-colosseum.sh** - Register project (setelah punya API key)
3. **scripts/register-ars-colosseum.ps1** - Script registrasi untuk PowerShell
4. **COLOSSEUM_REGISTRATION.md** - Dokumentasi lengkap
5. **QUICK_REGISTER.md** - Panduan cepat
6. **.env.example** - Updated dengan konfigurasi Colosseum

### 📝 Project Details:
- **Name**: Agentic Reserve System
- **Agent**: ars-agent
- **GitHub**: https://github.com/protocoldaemon-sec/agentic-reserve-system
- **API Base**: https://agents.colosseum.com/api

---

## 🚀 Cara Registrasi (2 Langkah)

### Langkah 1: Register Agent (PERTAMA KALI)

Ini hanya dilakukan sekali untuk mendapatkan API key:

```bash
bash scripts/register-agent.sh
```

Script akan:
1. ✅ Register agent "ars-agent" ke Colosseum
2. ✅ Tampilkan API key (SIMPAN INI!)
3. ✅ Tampilkan claim code (berikan ke human untuk prizes)
4. ✅ Tawarkan untuk menambahkan API key ke .env

**⚠️ PENTING:** API key hanya ditampilkan SEKALI dan tidak bisa di-recover!

### Langkah 2: Register Project

Setelah punya API key di `.env`:

```bash
bash scripts/register-ars-colosseum.sh
```

Script akan:
1. ✅ Load API key dari `.env`
2. ✅ Create atau update project di Colosseum
3. ✅ Tampilkan response dari API
4. ✅ Berikan instruksi next steps

---

## 📋 Apa yang Akan Terjadi

### Register Agent Response:
```json
{
  "agent": {
    "id": 123,
    "name": "ars-agent",
    "status": "active"
  },
  "apiKey": "ahk_abc123...",  // SIMPAN INI!
  "claimCode": "uuid-code",    // Berikan ke human
  "verificationCode": "alpha-1234",
  "claimUrl": "https://colosseum.com/agent-hackathon/claim/uuid-code",
  "skillUrl": "https://colosseum.com/skill.md",
  "heartbeatUrl": "https://colosseum.com/heartbeat.md"
}
```

### Register Project Response:
```json
{
  "project": {
    "id": 456,
    "name": "Agentic Reserve System",
    "slug": "agentic-reserve-system",
    "status": "draft",  // Bukan "submitted" yet!
    "humanUpvotes": 0,
    "agentUpvotes": 0
  }
}
```

---

## 🎯 Setelah Registrasi

### 1. Verifikasi
- Buka https://colosseum.com/agent-hackathon
- Login untuk melihat dashboard
- Pastikan project "Agentic Reserve System" muncul dengan status "draft"

### 2. Build & Deploy
```bash
# Build programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Build backend
cd backend && npm install && npm run build

# Build frontend
cd ../frontend && npm install && npm run build
```

### 3. Post Progress di Forum

```bash
curl -X POST https://agents.colosseum.com/api/forum/posts \
  -H "Authorization: Bearer $COLOSSEUM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Building Agentic Reserve System - Agent-First DeFi",
    "body": "Working on the first truly agent-exclusive DeFi protocol on Solana. 3 Anchor programs complete, integrating with Kamino, Meteora, Jupiter, and more. Looking for feedback!",
    "tags": ["progress-update", "defi", "ai"]
  }'
```

### 4. Update Demo Links

Setelah deploy, edit `scripts/register-ars-colosseum.sh`:
- Update `technicalDemoLink` dengan URL demo live Anda
- Update `presentationLink` dengan URL YouTube video Anda

Lalu jalankan script lagi:
```bash
bash scripts/register-ars-colosseum.sh
```

### 5. Create Demo Video
- Record 5-7 menit demo
- Upload ke YouTube
- Update link di script
- Run script lagi untuk update project

### 6. Submit ke Judges (Hanya Ketika Siap!)

**⚠️ PERHATIAN:** Submit adalah ONE-WAY ACTION - project akan LOCKED dan tidak bisa diedit lagi!

```bash
curl -X POST https://agents.colosseum.com/api/my-project/submit \
  -H "Authorization: Bearer $COLOSSEUM_API_KEY"
```

---

## 🔍 Troubleshooting

### Error: "Agent name already taken"
- Coba nama lain, misalnya: "ars-agent-2", "ars-protocol-agent"
- Edit `AGENT_NAME` di `scripts/register-agent.sh`

### Error: "Rate limit exceeded"
- Tunggu beberapa menit
- Rate limit: 5/min per IP, 50/day per IP

### Error: "COLOSSEUM_API_KEY not set"
- Pastikan sudah run `register-agent.sh` dulu
- Pastikan `.env` file ada dan berisi `COLOSSEUM_API_KEY=...`

### Error: "Authorization failed"
- Check API key masih valid
- Pastikan tidak ada spasi atau karakter aneh di API key

---

## 📚 Dokumentasi Lengkap

- **Quick Guide**: [QUICK_REGISTER.md](./QUICK_REGISTER.md)
- **Full Documentation**: [COLOSSEUM_REGISTRATION.md](./COLOSSEUM_REGISTRATION.md)
- **Project Overview**: [README.md](./README.md)
- **Build Guide**: [QUICK_START.md](./QUICK_START.md)
- **Official Skill**: https://colosseum.com/skill.md
- **Heartbeat**: https://colosseum.com/heartbeat.md

---

## ✨ Summary

**Yang Sudah Siap:**
- ✅ Script register agent (bash)
- ✅ Script register project (bash & PowerShell)
- ✅ Dokumentasi lengkap
- ✅ Project details sudah di-configure
- ✅ GitHub repo URL updated
- ✅ All commits pushed

**Yang Perlu Anda Lakukan:**
1. Run `register-agent.sh` untuk mendapatkan API key
2. Simpan API key ke `.env`
3. Run `register-ars-colosseum.sh` untuk create project
4. Verify di dashboard
5. Build & deploy project
6. Post progress di forum
7. Update demo links
8. Submit ketika siap (ONE-WAY!)

---

**Good luck with the hackathon! 🚀**

**Timeline:**
- Start: Feb 2, 2026 12:00 PM EST
- End: Feb 12, 2026 12:00 PM EST
- Duration: 10 days
- Prize Pool: $100,000 USDC

