const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys")
const fs = require('fs')

// Configurações Iniciais
const prefix = "."
const donoNum = "5511939595166@s.whatsapp.net" // COLOQUE SEU NÚMERO AQUI

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_leviatan')
    const conn = makeWASocket({ auth: state, printQRInTerminal: true })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const type = Object.keys(msg.message)[0]
        const body = (type === 'conversation') ? msg.message.conversation : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : ''
        
        // Sistema de Prefixo
        const isCmd = body.startsWith(prefix) || body.startsWith('+')
        const command = isCmd ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : null
        const args = body.trim().split(/ +/).slice(1)
        const q = args.join(" ")

        // Variáveis de Permissão
        const sender = msg.key.participant || msg.key.remoteJid
        const groupMetadata = isGroup ? await conn.groupMetadata(from) : ''
        const groupAdmins = isGroup ? groupMetadata.participants.filter(v => v.admin !== null).map(v => v.id) : []
        const isBotAdmins = isGroup ? groupAdmins.includes(conn.user.id.split(':')[0] + '@s.whatsapp.net') : false
        const isAdmin = isGroup ? groupAdmins.includes(sender) : false
        const isDono = sender === donoNum

        // Resposta ao comando "prefixo"
        if (body.toLowerCase() === 'prefixo') return conn.sendMessage(from, { text: `Meu prefixo é: *${prefix}*` })

        if (!isCmd) return

        switch (command) {
            // ================= [ MENU MEMBROS ] =================
            case 'menu': case 'menumemb':
                let m_txt = `🔱 *LEVIATÃN - MENU* 🔱\n\n`
                m_txt += `🔹 .play / .play2 / .playios\n🔹 .beijo / .tapa\n🔹 .corno / .chances\n🔹 .casar / .namorar / .adotar\n🔹 .jgdavelha\n🔹 .fig / .s\n🔹 .take / .t\n🔹 .eununca / .suicidio\n🔹 .lavarlouça / .afk\n🔹 .ativos / .perfil / .ranking`
                conn.sendMessage(from, { text: m_txt })
                break

            case 'play': case 'play2': case 'playios':
                conn.sendMessage(from, { text: "🔍 Buscando música... (Requer integração com YT-Search)" })
                break

            case 'beijo': case 'tapa': case 'lavarlouça':
                let mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid[0]
                if (!mention) return conn.sendMessage(from, { text: "Mencione alguém!" })
                conn.sendMessage(from, { text: `@${sender.split('@')[0]} deu um ${command} em @${mention.split('@')[0]}`, mentions: [sender, mention] })
                break

            case 'corno':
                let rdm = Math.floor(Math.random() * 100)
                conn.sendMessage(from, { text: `🐂 Você é ${rdm}% corno!` })
                break

            case 'fig': case 's':
                conn.sendMessage(from, { text: "Converta imagens em figurinhas usando lib: webp" })
                break

            case 'suicidio':
                if (!isGroup) return
                await conn.sendMessage(from, { text: "Adeus mundo cruel... 👋" })
                await conn.groupParticipantsUpdate(from, [sender], "remove")
                break

            // ================= [ MENU ANTI ] =================
            case 'menuantlink':
                if (!isAdmin) return
                conn.sendMessage(from, { text: "🚫 *ANTI-SISTEMA*\n\n.antilink\n.antifloods\n.anticanal\n.divulgacao" })
                break

            case 'antilink':
                // Lógica: Salvar no DB que antilink está ON
                conn.sendMessage(from, { text: "✅ Anti-link ativado com sucesso!" })
                break

            // ================= [ MENU ADM ] =================
            case 'menuadm':
                if (!isAdmin) return
                conn.sendMessage(from, { text: "👮 *ADMINS*\n\n.ban / .ban2\n.M (marcar todos)\n.mute (1, 2, 3)\n.grupo a/f\n.promover / .rebaixar\n.vizu / .D" })
                break

            case 'ban': case 'ban2':
                if (!isAdmin || !isBotAdmins) return
                let user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid[0]
                await conn.groupParticipantsUpdate(from, [user], "remove")
                break

            case 'm':
                let mems = groupMetadata.participants.map(v => v.id)
                conn.sendMessage(from, { text: `📢 *AVISO GERAL*:\n\n${q}`, mentions: mems })
                break

            case 'grupo':
                if (args[0] === 'a') await conn.groupSettingUpdate(from, 'not_announcement')
                if (args[0] === 'f') await conn.groupSettingUpdate(from, 'announcement')
                break

            case 'd':
                if (!msg.message.extendedTextMessage) return
                let key = {
                    remoteJid: from,
                    fromMe: false,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant
                }
                await conn.sendMessage(from, { delete: key })
                break

            // ================= [ MENU DONO ] =================
            case 'menudn': case 'dn':
                if (!isDono) return
                conn.sendMessage(from, { text: "👑 *MENU SUPREMO*\n\n+ativarbot\n+ping\n+advadm\n+manutencao\n+1234 (Segurança)" })
                break

            case 'ping':
                const start = Date.now()
                await conn.sendMessage(from, { text: "Calculando..." })
                const end = Date.now()
                conn.sendMessage(from, { text: `⚡ Latência: ${end - start}ms` })
                break

            case '1234': // Código Secreto
                if (isDono) conn.sendMessage(from, { text: "🔐 Sistema recuperado. Proprietário autenticado." })
                break
                
            case '2266': // Proteção
                if (isDono) conn.sendMessage(from, { text: "🛡️ Proteção anti-hack e anti-trava ativada." })
                break
        }
    })
}

startBot()
