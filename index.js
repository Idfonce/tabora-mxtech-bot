const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const readline = require('readline')

// Create auth folder
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth')

console.log('\n🇹🇿 ======================================== 🇹🇿')
console.log('    WELCOME TO TABORA-MXTECH BOT')
console.log('    Created in Tanzania | East Africa')
console.log('    Version 2.0 | 4 Features Activated')
console.log('🇹🇿 ======================================== 🇹🇿\n')

// Database
let db = {}
const DB_FILE = './database.json'
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('./auth')
        
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Tabora-MXtech', 'Chrome', '2.0.0'],
            markOnlineOnConnect: true,
            syncFullHistory: false
        })

        // Ask for phone number if not registered
        if (!state.creds?.registered) {
            console.log('\n📱 Enter your Tanzania phone number (e.g., 255623553450):')
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })

            rl.question('📱 Number: ', async (number) => {
                rl.close()
                
                try {
                    const cleanNumber = number.replace(/\D/g, '')
                    console.log(`⏳ Getting pairing code for ${cleanNumber}...`)
                    
                    const code = await sock.requestPairingCode(cleanNumber)
                    console.log('\n✅ ============================ ✅')
                    console.log('   🔑 YOUR CODE: ' + code)
                    console.log('✅ ============================ ✅\n')
                    console.log('1. Open WhatsApp → Settings → Linked Devices')
                    console.log('2. Tap "Link a Device"')
                    console.log('3. Enter this code: ' + code)
                    console.log('4. Wait for connection...\n')
                } catch (err) {
                    console.log('❌ Error:', err.message)
                }
            })
        }

        // Handle connection
        sock.ev.on('connection.update', (update) => {
            const { connection } = update
            if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED SUCCESSFULLY! 🇹🇿\n')
                
                // Keep alive
                setInterval(() => {
                    try {
                        if (sock.user?.id) {
                            sock.sendPresenceUpdate('available')
                        }
                    } catch (err) {}
                }, 20000)
            }
        })

        // Handle commands
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (!msg.message) return
            
            const from = msg.key.remoteJid
            const sender = msg.key.participant || from
            const senderNumber = sender.split('@')[0]
            
            let text = ''
            if (msg.message.conversation) text = msg.message.conversation
            else if (msg.message.extendedTextMessage) text = msg.message.extendedTextMessage.text
            else return
            
            if (!text.startsWith('.')) return
            
            const command = text.slice(1).split(' ')[0].toLowerCase()
            const arg = text.slice(1).split(' ')[1]?.toLowerCase()
            
            // User settings
            if (!db[senderNumber]) {
                db[senderNumber] = {
                    autostatusreact: false,
                    autoviewstatus: false,
                    alwaysonline: false,
                    antidelete: false
                }
                saveDB()
            }
            
            const user = db[senderNumber]
            
            // Commands
            if (command === 'autostatusreact') {
                if (arg === 'on') {
                    user.autostatusreact = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ Auto Status React Activated! ❤️' })
                } else if (arg === 'off') {
                    user.autostatusreact = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ Auto Status React Deactivated!' })
                }
            }
            
            else if (command === 'autoviewstatus') {
                if (arg === 'on') {
                    user.autoviewstatus = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ Auto View Status Activated! 👀' })
                } else if (arg === 'off') {
                    user.autoviewstatus = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ Auto View Status Deactivated!' })
                }
            }
            
            else if (command === 'alwaysonline') {
                if (arg === 'on') {
                    user.alwaysonline = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ Always Online Activated! 🟢' })
                } else if (arg === 'off') {
                    user.alwaysonline = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ Always Online Deactivated!' })
                }
            }
            
            else if (command === 'antidelete') {
                if (arg === 'on') {
                    user.antidelete = true
                    saveDB()
                    await sock.sendMessage(from, { text: '✅ Anti Delete Activated! 🗑️' })
                } else if (arg === 'off') {
                    user.antidelete = false
                    saveDB()
                    await sock.sendMessage(from, { text: '❌ Anti Delete Deactivated!' })
                }
            }
            
            else if (command === 'help') {
                const help = `🇹🇿 *TABORA-MXTECH BOT*
                
.autostatusreact on/off - Auto react ❤️
.autoviewstatus on/off - Auto view 👀
.alwaysonline on/off - 24/7 online 🟢
.antidelete on/off - See deleted 🗑️
.help - Show this menu`
                await sock.sendMessage(from, { text: help })
            }
        })

        // Handle status updates
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (msg.key?.remoteJid === 'status@broadcast') {
                const sender = msg.key.participant?.split('@')[0]
                
                if (db[sender]?.autoviewstatus) {
                    await sock.readMessages([msg.key])
                }
                
                if (db[sender]?.autostatusreact) {
                    setTimeout(async () => {
                        await sock.sendMessage('status@broadcast', {
                            react: { text: '❤️', key: msg.key }
                        })
                    }, 2000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

    } catch (err) {
        console.log('❌ Error:', err.message)
        setTimeout(startBot, 5000)
    }
}

// Start
startBot()
