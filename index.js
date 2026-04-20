const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require("@whiskeysockets/baileys")
const { Boom } = require("@hapi/boom")
const qrcode = require("qrcode-terminal")
const fs = require('fs')
const pino = require("pino")

// Configurações Iniciais
const prefix = "."
const donoNum = "5511939595166@s.whatsapp.net" 

async function startBot() {
    // Gerenciamento de sessão
    const { state, saveCreds } = await useMultiFileAuthState('sessao_leviatan')
    
    const conn = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false, // Desativado para usar o qrcode-terminal manualmente
        logger: pino({ level: 'silent' }) // Silencia os logs feios na tela
    })

    conn.ev.on('creds.update', saveCreds)

    // --- LOGICA DE CONEXÃO E QR CODE ---
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log("🔱 LEVIATÃN: ESCANEIE O QR CODE ABAIXO 🔱")
            // Gera o QR Code de forma amigável para o Termux
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Conexão fechada. Tentando reconectar...', shouldReconnect)
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ LEVIATÃN CONECTADO COM SUCESSO!')
        }
    })

    // --- SISTEMA DE BOAS-VINDAS ---
    conn.ev.on('group-participants.update', async (anu) => {
        const metadados = await conn.groupMetadata(anu.id)
        for (let participant of anu.participants) {
            if (anu.action == 'add') {
                let boasvindas = `Olá @${participant.split('@')[0]}, bem-vindo ao grupo *${metadados.subject}*!\n\nApresente-se com Nome, Foto, Idade e Cidade.\n\n🔱 *Bot Leviatãn*`
                conn.sendMessage(anu.id, { text: boasvindas, mentions: [participant] })
            } else if (anu.action == 'remove') {
                let adeus = `Que pena que @${participant.split('@')[0]} saiu... sentiremos falta (ou não) 😈`
                conn.sendMessage(anu.id, { text: adeus, mentions: [participant] })
            }
        }
    })

    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const type = Object.keys(msg.message)[0]
        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : ''
        
        const isCmd = body.startsWith(prefix) || body.startsWith('+')
        const command = isCmd ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : null
        const args = body.trim().split(/ +/).slice(1)
        const q = args.join(" ")

        const sender = msg.key.participant || msg.key.remoteJid
        const groupMetadata = isGroup ? await conn.groupMetadata(from) : ''
        const groupAdmins = isGroup ? groupMetadata.participants.filter(v => v.admin !== null).map(v => v.id) : []
        const isBotAdmins = isGroup ? groupAdmins.includes(conn.user.id.split(':')[0] + '@s.whatsapp.net') : false
        const isAdmin = isGroup ? groupAdmins.includes(sender) : false
        const isDono = sender === donoNum

        if (body.toLowerCase() === 'prefixo') return conn.sendMessage(from, { text: `Meu prefixo é: *${prefix}*` })

        if (!isCmd) return

        switch (command) {
            case 'menu': case 'menumemb':
                let m_txt = `🔱 *LEVIATÃN - MENU* 🔱\n\n`
                m_txt += `🔹 .play / .play2\n🔹 .beijo / .tapa\n🔹 .corno / .chances\n🔹 .fig / .s\n🔹 .suicidio\n🔹 .perfil`
                conn.sendMessage(from, { text: m_txt })
                break

            case 'corno':
                conn.sendMessage(from, { text: `🐂 Você é ${Math.floor(Math.random() * 100)}% corno!` })
                break

            case 'ping':
                const start = Date.now()
                await conn.sendMessage(from, { text: "Calculando..." })
                conn.sendMessage(from, { text: `⚡ Latência: ${Date.now() - start}ms` })
                break

            case 'suicidio':
                if (!isGroup) return
                await conn.sendMessage(from, { text: "Adeus mundo cruel... 👋" })
                await conn.groupParticipantsUpdate(from, [sender], "remove")
                break
        }
    })
}

startBot()
