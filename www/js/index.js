// deviceready listener removed for web deployment

    class GameScene extends Phaser.Scene {
        constructor() {
            super({ key: 'GameScene' });
            this.player = null;
            this.cursors = null;
            this.interactKey = null; // Will be defined in create

            // --- Touch Control Flags/Refs ---
            this.isTouchDevice = false;
            this.dpad = {
                up: null,
                down: null,
                left: null,
                right: null,
                interact: null
            };
            this.touchFlags = {
                up: false,
                down: false,
                left: false,
                right: false,
                interactPressed: false // For single press detection
            };


            // --- Lesson Data ---
            this.lessons = [
                {
                    id: 'lesson0',
                    title: 'What are Sats?',
                    content: 'Sats, short for Satoshis, are the smallest unit of Bitcoin. 1 Bitcoin = 100,000,000 Sats.',
                    reward: 5 // Example reward
                }
                // Add more lessons here
            ];

            // --- NPC Data ---
             this.npcs = [
                { id: 'npc1', type: 'knowledge', dataId: 'lesson0', x: 150, y: 150, spriteKey: 'npc_knowledge', sprite: null }, // Adjusted for 800x600 background
                { id: 'npc2', type: 'quiz', dataId: 'quiz4', x: 650, y: 150, spriteKey: 'npc_quiz', sprite: null } // Adjusted for 800x600 background
            ];


            // --- Quiz Data ---
            // Using quiz4 (Bitcoin Basics) as the initial quiz data
            this.quizzes = [
                {
                    id: 'quiz4',
                    topic: 'Bitcoin Basics',
                    cost: 1, // Example cost
                    reward: 1, // Example reward
                    questions: [
                        {
                            q: 'What is the maximum supply of Bitcoin?',
                            a: ['21 million', '100 million', '1 billion', 'Unlimited'],
                            correct: '21 million',
                            duration: 15 // Optional: Time limit per question
                        },
                        {
                            q: 'Who is the pseudonymous creator of Bitcoin?',
                            a: ['Vitalik Buterin', 'Satoshi Nakamoto', 'Elon Musk', 'Craig Wright'],
                            correct: 'Satoshi Nakamoto',
                            duration: 15
                        },
                        {
                            q: 'What is the approximate block time for Bitcoin?',
                            a: ['1 minute', '10 minutes', '1 hour', '1 day'],
                            correct: '10 minutes',
                            duration: 15
                        },
                        {
                            q: 'What consensus mechanism does Bitcoin use?',
                            a: ['Proof of Stake', 'Proof of Authority', 'Proof of Work', 'Proof of Burn'],
                            correct: 'Proof of Work',
                            duration: 15
                        }
                    ]
                }
                // Add more quizzes here if needed
            ];

            // --- Quiz State Variables ---
            this.quizIsActive = false;
            this.currentQuestionData = null; // Will hold { q: '...', a: [...], correct: '...' }
            this.currentCorrectAnswerIndex = -1; // Index (0-3) of the correct answer
            this.currentQuizQuestionIndex = 0; // Index of the current question within the selected quiz
            this.timerEvent = null; // To hold the Phaser TimerEvent
            this.remainingTime = 0;
            this.answerZones = []; // To hold Phaser.Geom.Rectangle objects
            this.answerTexts = []; // To hold answer text objects
            this.questionText = null; // To hold question text object
            this.timerText = null; // To hold timer text object
            this.playerScore = 0; // To track player's score
            this.scoreText = null; // To hold score text object
            this.completedLessons = new Set(); // Track completed lessons
            this.feedbackText = null; // For displaying "Correct!" or "Wrong!"

            // --- NPC Interaction State ---
            // this.interactKey is already defined above
            this.closestNpc = null;
            this.interactionPromptText = null;
            this.showingKnowledgeUI = false;
            this.showingQuizPromptUI = false;
            this.currentNpcInteraction = null; // Store the npc object being interacted with
            this.knowledgeContainer = null; // UI Container for knowledge
            this.quizPromptContainer = null; // UI Container for quiz prompt
        }

        preload() {
            // Load player image (using player-small.png as placeholder)
            // this.load.image('player', 'img/player-small.png');
            // Load NPC placeholder images
            // this.load.image('npc_knowledge', 'img/cordova-small.png'); // Placeholder
            // this.load.image('npc_quiz', 'img/cordova-small.png'); // Placeholder
            this.load.spritesheet('player_spritesheet', 'img/characters/RPG_assets.png', { frameWidth: 15, frameHeight: 15 });
            this.load.image('npc_sprite', 'img/characters/dark-ent.png');
            // Comment out old background image
            this.load.image('newBackground', 'img/mainroom_bg.png');
            // Load new tilemap assets
            // this.load.image('tiles', 'assets/map/spritesheet-extruded.png');
            // this.load.tilemapTiledJSON('map', 'assets/map/map.json');
            // Load interact button image
            this.load.image('interact_button', 'img/icons/target.png'); // Using target.png for interact
        }

        create() {
            // --- Socket.IO Initialization ---
            // this.socket = io(); // Multiplayer removed
            // this.otherPlayers = this.physics.add.group(); // Multiplayer removed

            // --- Assumed dimensions for the new background ---
            // Dimensions of the background image, confirmed by user.
            const imageWidth = 800;
            const imageHeight = 600;

            // --- Comment out Static Background Image ---
            this.add.image(0, 0, 'newBackground').setOrigin(0, 0);

            // --- Tilemap Setup ---
            // const map = this.make.tilemap({ key: 'map' });
            // // Args: Tiled tileset name, Phaser key for tileset image, tileW, tileH, margin, spacing
            // const tileset = map.addTilesetImage('spritesheet', 'tiles', 16, 16, 0, 0);

            // // --- Create Layers ---
            // // Ensure layer names match those in your Tiled JSON file
            // const groundLayer = map.createLayer('Grass', tileset, 0, 0);
            // const collisionLayer = map.createLayer('Obstacles', tileset, 0, 0);

            // // --- Collision Setup ---
            // // Assumes 'Obstacles' layer has a custom property 'collides: true' in Tiled
            // if (collisionLayer) { // Check if layer exists
            //     collisionLayer.setCollisionByProperty({ collides: true });
            // }


            // --- Adjust World and Camera Bounds to Static Background ---
            this.physics.world.setBounds(0, 0, 800, 600);
            this.cameras.main.setBounds(0, 0, 800, 600);
            this.cameras.main.roundPixels = true; // Helps prevent tile bleeding
            // this.cameras.main.setZoom(1.25); // Ensure zoom is off for static background

            // Optional: Make camera follow player if map is larger than screen
            // this.cameras.main.startFollow(this.player, true, 0.08, 0.08);


            // --- Player (Top-down view) ---
            // Position player within the new background
            this.player = this.physics.add.sprite(400, 450, 'player_spritesheet', 0); // Adjusted for visibility on 800x600, using new spritesheet
            this.player.setScale(2); // Scale up new player sprite
            this.player.setCollideWorldBounds(true); // Player collides with world bounds (now 800x600)
            this.player.body.setSize(20, 20); // Adjust as needed, new sprite is 20x20
            this.player.oldPosition = { x: this.player.x, y: this.player.y }; // Initialize oldPosition

            // --- Add Collider with Tilemap Collision Layer ---
            // if (collisionLayer) { // Check if layer exists
            //     this.physics.add.collider(this.player, collisionLayer); // This would cause an error as collisionLayer is not defined
            // }

            // --- Camera Follow Player ---
            this.cameras.main.startFollow(this.player, true, 0.08, 0.08);


            // --- Spawn NPCs ---
            this.npcs.forEach(npc => {
                const npcSprite = this.physics.add.staticSprite(npc.x, npc.y, 'npc_sprite'); // Use new NPC sprite
                npc.sprite = npcSprite; // Store sprite reference
                npcSprite.setScale(2); // Scale up new NPC sprite
                npcSprite.body.setSize(20, 20); // Set explicit physics size, new sprite is 20x20
                npcSprite.body.immovable = true; // Make NPC immovable
                // Original NPC collision with player (still needed if NPCs are obstacles)
                this.physics.add.collider(this.player, npcSprite);
            });

            // --- UI Text Elements ---
            this.questionText = this.add.text(400, 50, 'Loading question...', {
                fontSize: '24px',
                fill: '#fff',
                align: 'center',
                wordWrap: { width: 750 }
            }).setOrigin(0.5);

            const answerStyle = { fontSize: '18px', fill: '#fff' };
            const answerY = 500; // Lowered Y position for zones below
            const answerZoneWidth = 100;
            const answerZoneHeight = 100;
            const answerZoneY = 450; // Y position for the top of the zones

            // Define Answer Zones (Rectangles) and Text
            const zonePositions = [
                { x: 100, textX: 150 }, // Zone A
                { x: 300, textX: 350 }, // Zone B
                { x: 500, textX: 550 }, // Zone C
                { x: 700, textX: 750 }  // Zone D
            ];

            // Optional: Graphics for visualizing zones
            const graphics = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00 }, fillStyle: { color: 0x00ff00, alpha: 0.1 } });

            zonePositions.forEach((pos, index) => {
                const zone = new Phaser.Geom.Rectangle(
                    pos.x,
                    answerZoneY,
                    answerZoneWidth,
                    answerZoneHeight
                );
                this.answerZones.push(zone);

                // Draw zone for debugging
                graphics.strokeRectShape(zone);
                graphics.fillRectShape(zone);


                const answerText = this.add.text(pos.textX, answerY, String.fromCharCode(65 + index), answerStyle).setOrigin(0.5);
                this.answerTexts.push(answerText);
            });


            this.timerText = this.add.text(750, 20, 'Time: 0', {
                fontSize: '20px',
                fill: '#fff'
            }).setOrigin(1, 0); // Origin top-right

            // --- Score Display ---
            this.scoreText = this.add.text(20, 20, 'Sats: ' + this.playerScore, {
                fontSize: '20px',
                fill: '#fff'
            }).setOrigin(0, 0); // Origin top-left


            // --- Controls ---
            this.cursors = this.input.keyboard.createCursorKeys();
            this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

            // --- Touch Controls Setup ---
            this.isTouchDevice = this.sys.game.device.input.touch;

            if (this.isTouchDevice) {
                const controlSize = 64;
                const controlPadding = 10;
                const interactButtonSize = 72;
                const screenWidth = this.cameras.main.width;
                const screenHeight = this.cameras.main.height;

                // D-Pad (bottom-left)
                // Left
                this.dpad.left = this.add.rectangle(controlPadding + controlSize / 2, screenHeight - controlPadding - controlSize * 1.5, controlSize, controlSize, 0x888888, 0.5).setInteractive();
                this.dpad.left.on('pointerdown', () => { this.touchFlags.left = true; });
                this.dpad.left.on('pointerup', () => { this.touchFlags.left = false; });
                this.dpad.left.on('pointerout', () => { this.touchFlags.left = false; }); // Stop if pointer leaves button while pressed

                // Right
                this.dpad.right = this.add.rectangle(controlPadding + controlSize * 2.5, screenHeight - controlPadding - controlSize * 1.5, controlSize, controlSize, 0x888888, 0.5).setInteractive();
                this.dpad.right.on('pointerdown', () => { this.touchFlags.right = true; });
                this.dpad.right.on('pointerup', () => { this.touchFlags.right = false; });
                this.dpad.right.on('pointerout', () => { this.touchFlags.right = false; });

                // Up
                this.dpad.up = this.add.rectangle(controlPadding + controlSize * 1.5, screenHeight - controlPadding - controlSize * 2.5, controlSize, controlSize, 0x888888, 0.5).setInteractive();
                this.dpad.up.on('pointerdown', () => { this.touchFlags.up = true; });
                this.dpad.up.on('pointerup', () => { this.touchFlags.up = false; });
                this.dpad.up.on('pointerout', () => { this.touchFlags.up = false; });

                // Down
                this.dpad.down = this.add.rectangle(controlPadding + controlSize * 1.5, screenHeight - controlPadding - controlSize / 2, controlSize, controlSize, 0x888888, 0.5).setInteractive();
                this.dpad.down.on('pointerdown', () => { this.touchFlags.down = true; });
                this.dpad.down.on('pointerup', () => { this.touchFlags.down = false; });
                this.dpad.down.on('pointerout', () => { this.touchFlags.down = false; });

                // Interact Button (bottom-right)
                this.dpad.interact = this.add.sprite(screenWidth - controlPadding - interactButtonSize / 2, screenHeight - controlPadding - interactButtonSize / 2, 'interact_button').setInteractive();
                this.dpad.interact.setDisplaySize(interactButtonSize, interactButtonSize);
                this.dpad.interact.setAlpha(0.7);
                this.dpad.interact.on('pointerdown', () => {
                    this.touchFlags.interactPressed = true;
                    // Optional: visual feedback
                    this.dpad.interact.setAlpha(1);
                    this.time.delayedCall(100, () => {
                         if(this.dpad.interact) this.dpad.interact.setAlpha(0.7);
                    });
                });
                // No pointerup needed for interactPressed as it's a single-frame flag, reset in update

                // Make controls fixed to camera
                [this.dpad.left, this.dpad.right, this.dpad.up, this.dpad.down, this.dpad.interact].forEach(control => {
                    if (control) control.setScrollFactor(0);
                });
            }

            // --- Interaction Prompt Text ---
            this.interactionPromptText = this.add.text(this.player.x, this.player.y - 30, 'Press E', {
                fontSize: '12px',
                fill: '#fff',
                backgroundColor: 'rgba(0,0,0,0.7)', // Added background for visibility
                padding: { x: 5, y: 2 }
            }).setOrigin(0.5).setVisible(false);

            // --- Knowledge UI Container ---
            const knowledgeBg = this.add.rectangle(400, 300, 500, 300, 0x000033, 0.9).setStrokeStyle(2, 0xffffff);
            const knowledgeTitle = this.add.text(400, 180, 'Lesson Title', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
            const knowledgeContent = this.add.text(400, 280, 'Lesson content goes here.', { fontSize: '16px', fill: '#fff', wordWrap: { width: 480 }, align: 'center' }).setOrigin(0.5);
            const knowledgeClose = this.add.text(400, 420, '[Press E to Close]', { fontSize: '14px', fill: '#aaa' }).setOrigin(0.5);
            this.knowledgeContainer = this.add.container(0, 0, [knowledgeBg, knowledgeTitle, knowledgeContent, knowledgeClose]);
            this.knowledgeContainer.setVisible(false);

            // --- Quiz Prompt UI Container ---
            const quizPromptBg = this.add.rectangle(400, 300, 400, 250, 0x330000, 0.9).setStrokeStyle(2, 0xffffff);
            const quizPromptTitle = this.add.text(400, 210, 'Quiz Challenge!', { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
            const quizPromptTopic = this.add.text(400, 250, 'Topic: Bitcoin Basics', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
            const quizPromptCost = this.add.text(400, 280, 'Cost: 1 Sats', { fontSize: '16px', fill: '#ffcc00' }).setOrigin(0.5);
            const quizPromptStart = this.add.text(400, 330, '[Press E to Start]', { fontSize: '14px', fill: '#aaa' }).setOrigin(0.5);
            const quizPromptClose = this.add.text(400, 360, '[Move Away to Cancel]', { fontSize: '12px', fill: '#aaa' }).setOrigin(0.5); // Added cancel instruction
            this.quizPromptContainer = this.add.container(0, 0, [quizPromptBg, quizPromptTitle, quizPromptTopic, quizPromptCost, quizPromptStart, quizPromptClose]);
            this.quizPromptContainer.setVisible(false);

            // --- Feedback Text ---
            this.feedbackText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', {
                fontSize: '48px',
                fill: '#fff',
                align: 'center',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5).setVisible(false).setDepth(10); // High depth to appear on top


            // --- Load Initial Question ---
            // this.loadQuestion(0, 0); // REMOVED - Quiz now starts via NPC interaction

            // --- Socket Event Handlers ---
            // this.socket.on('currentPlayers', (players) => { // Multiplayer removed
            //   Object.keys(players).forEach((id) => {
            //     if (players[id].id === this.socket.id) {
            //       // Optionally, handle self-data if needed, or add own player to a group
            //     } else {
            //       // Check if player already exists
            //       const existingPlayer = this.otherPlayers.getChildren().find(op => op.playerId === players[id].id);
            //
            //       if (!existingPlayer) {
            //         // Add sprite for other players
            //         const otherPlayer = this.physics.add.sprite(players[id].x, players[id].y, 'player_spritesheet', 0); // Use 'player_spritesheet' or a different key if you want different sprites for others
            //         otherPlayer.playerId = players[id].id;
            //         otherPlayer.setScale(2); // Apply scaling if needed, consistent with local player
            //         this.otherPlayers.add(otherPlayer);
            //       } else {
            //         // Player already exists, update position
            //         existingPlayer.setPosition(players[id].x, players[id].y);
            //       }
            //     }
            //   });
            // });
            //
            // this.socket.on('newPlayer', (playerInfo) => { // Multiplayer removed
            //   // Ensure not to add self if server broadcasts own connection as newPlayer
            //   if (playerInfo.id !== this.socket.id) {
            //     // Check if player already exists
            //     const existingPlayer = this.otherPlayers.getChildren().find(op => op.playerId === playerInfo.id);
            //
            //     if (!existingPlayer) {
            //       const otherPlayer = this.physics.add.sprite(playerInfo.x, playerInfo.y, 'player_spritesheet', 0);
            //       otherPlayer.playerId = playerInfo.id;
            //       otherPlayer.setScale(2); // Apply scaling
            //       this.otherPlayers.add(otherPlayer);
            //     } else {
            //       // Player already exists, update position (though newPlayer typically means they weren't there)
            //       // This case might be redundant if server logic is perfect, but good for robustness
            //       existingPlayer.setPosition(playerInfo.x, playerInfo.y);
            //     }
            //   }
            // });
            //
            // this.socket.on('playerMoved', (playerInfo) => { // Multiplayer removed
            //   this.otherPlayers.getChildren().forEach((otherPlayer) => {
            //     if (playerInfo.id === otherPlayer.playerId) {
            //       otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            //       // Potentially update animation/frame based on movement in future
            //     }
            //   });
            // });
            //
            // this.socket.on('playerDisconnected', (playerId) => { // Multiplayer removed
            //   this.otherPlayers.getChildren().forEach((otherPlayer) => {
            //     if (playerId === otherPlayer.playerId) {
            //       otherPlayer.destroy();
            //     }
            //   });
            // });
        }

        update() {
            const speed = 160;
            const interactionRange = 50; // Max distance to show interaction prompt
            const uiCloseRange = 100; // Max distance before UI closes automatically

            // --- Interaction Logic ---
            let currentClosestNpc = null; // Use a temporary variable for this frame's check

            if (!this.showingKnowledgeUI && !this.showingQuizPromptUI && !this.quizIsActive) { // Only check for new interactions if no UI is open and quiz isn't running
                 let minDist = interactionRange;
                 this.npcs.forEach(npc => {
                    if (npc.sprite) { // Ensure sprite exists
                        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
                        if (distance < minDist) {
                            minDist = distance;
                            currentClosestNpc = npc; // Update temp variable
                        }
                    }
                });
                 // Update the main state variable ONLY if we were actively checking
                 this.closestNpc = currentClosestNpc;
            }
            // If UI is showing or quiz is active, this.closestNpc retains its value from the last valid check


            // Show/Hide Interaction Prompt (Based on the potentially updated this.closestNpc)
            if (this.closestNpc && !this.showingKnowledgeUI && !this.showingQuizPromptUI && !this.quizIsActive) {
                this.interactionPromptText.setPosition(this.player.x, this.player.y - 30).setVisible(true);
            } else {
                this.interactionPromptText.setVisible(false);
            }

            // Handle 'E' Key Press or Touch Interact
            const justPressedE = Phaser.Input.Keyboard.JustDown(this.interactKey);
            const justTouchedInteract = this.touchFlags.interactPressed;

            if (justPressedE || justTouchedInteract) {
                if (this.showingQuizPromptUI && this.currentNpcInteraction) {
                    // Attempt to start the quiz
                    this.startQuiz(this.currentNpcInteraction.dataId);
                } else if (this.showingKnowledgeUI) {
                     // Close knowledge UI
                     this.hideAllNpcUI();
                } else if (this.closestNpc) {
                    // Initiate interaction with the closest NPC
                    this.handleNpcInteraction(this.closestNpc);
                } else {
                    // Optional: Log if E is pressed with no target, if needed for future debugging
                    // console.log("'E' pressed but no interaction target.");
                }
            }

            // --- UI Auto-Close Logic ---
            if ((this.showingKnowledgeUI || this.showingQuizPromptUI) && this.currentNpcInteraction && this.currentNpcInteraction.sprite) {
                 const distanceToCurrentNpc = Phaser.Math.Distance.Between(
                     this.player.x, this.player.y,
                     this.currentNpcInteraction.sprite.x, this.currentNpcInteraction.sprite.y
                 );
                 if (distanceToCurrentNpc > uiCloseRange) {
                     this.hideAllNpcUI();
                 }
            }


            // --- Player Movement ---
            // Player movement is always allowed based on input keys.
            // Quiz logic (checkAnswer) and UI logic handle states where movement might be implicitly stopped or consequences occur.

            // Reset velocity
            this.player.setVelocity(0);

            // Player Movement (4-Directional Top-Down)
            if (this.cursors.left.isDown || this.touchFlags.left) {
                this.player.setVelocityX(-speed);
            } else if (this.cursors.right.isDown || this.touchFlags.right) {
                this.player.setVelocityX(speed);
            }

            if (this.cursors.up.isDown || this.touchFlags.up) {
                this.player.setVelocityY(-speed);
            } else if (this.cursors.down.isDown || this.touchFlags.down) {
                this.player.setVelocityY(speed);
            }

            // Normalize and scale the velocity if moving
            if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
                 this.player.body.velocity.normalize().scale(speed);
            }

            // Reset single-frame touch flags
            if (this.touchFlags.interactPressed) {
                this.touchFlags.interactPressed = false;
            }

            // --- Emit Player Movement --- // Multiplayer removed
            // if (this.player && this.socket) { // Ensure player and socket exist
            //   const x = this.player.x;
            //   const y = this.player.y;
            //   // const r = this.player.rotation; // If syncing rotation
            //
            //   if (this.player.oldPosition && (x !== this.player.oldPosition.x || y !== this.player.oldPosition.y /* || r !== this.player.oldPosition.rotation */)) {
            //     this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y /*, rotation: this.player.rotation */ });
            //   }
            //   // Store old position
            //   this.player.oldPosition = {
            //     x: this.player.x,
            //     y: this.player.y,
            //     // rotation: this.player.rotation
            //   };
            // }
        }


        // --- Load Question Function ---
        loadQuestion(quizIndex, questionIndex) {
            console.log(`Loading quiz ${quizIndex}, question ${questionIndex}`);
            // Select the quiz data
            const quiz = this.quizzes[quizIndex];
            if (!quiz) {
                console.error(`Quiz with index ${quizIndex} not found.`);
                this.questionText.setText('Error: Quiz not found.');
                this.quizIsActive = false;
                return;
            }

            // Get the specific question data
            const questionData = quiz.questions[questionIndex];
            if (!questionData) {
                console.error(`Question with index ${questionIndex} not found in quiz ${quizIndex}.`);
                this.questionText.setText('Error: Question not found.');
                this.quizIsActive = false;
                return;
            }

            // Store current question data and correct answer index
            this.currentQuestionData = questionData;
            this.currentCorrectAnswerIndex = questionData.a.indexOf(questionData.correct);
            if (this.currentCorrectAnswerIndex === -1) {
                 console.error(`Correct answer "${questionData.correct}" not found in options:`, questionData.a);
                 // Handle error appropriately, maybe skip question or show an error message
                 this.questionText.setText('Error: Invalid question data.');
                 this.quizIsActive = false;
                 return;
            }

            // Update UI
            this.questionText.setText(questionData.q);
            this.answerTexts.forEach((text, index) => {
                if (questionData.a[index] !== undefined) {
                    text.setText(`${String.fromCharCode(65 + index)}: ${questionData.a[index]}`);
                } else {
                    text.setText(`${String.fromCharCode(65 + index)}: -`); // Handle cases with fewer than 4 answers
                }
            });

            // Reset background color and start timer
            this.cameras.main.setBackgroundColor('#000000');
            this.startQuestionTimer(questionData.duration || 15); // Use question duration or default to 15s

            // Set quiz active state
            this.quizIsActive = true;
            console.log("Question loaded, quiz active.");
        }


        // --- Quiz Timer Functions ---
        startQuestionTimer(durationSeconds) {
            this.remainingTime = durationSeconds;
            this.timerText.setText('Time: ' + this.remainingTime);

            // Remove any existing timer to prevent duplicates
            if (this.timerEvent) {
                this.timerEvent.remove(false);
            }

            // Create a new timer event
            this.timerEvent = this.time.addEvent({
                delay: 1000, // 1 second
                callback: this.tickTimer,
                callbackScope: this,
                loop: true
            });
             console.log("Timer started with duration:", durationSeconds);
        }

        tickTimer() {
            this.remainingTime--;
            this.timerText.setText('Time: ' + this.remainingTime);
             // console.log("Timer tick:", this.remainingTime); // Removed debug log

            if (this.remainingTime <= 0) {
                console.log("Timer expired!");
                if (this.timerEvent) {
                     this.timerEvent.remove(false); // Stop the timer event
                     this.timerEvent = null; // Clear the reference
                }
                this.checkAnswer(); // Check answer when time runs out
            }
        }

        // --- Answer Checking Function ---
        checkAnswer() {
            console.log("Checking answer...");
            this.quizIsActive = false; // Stop movement, end the round temporarily

            // Stop the timer if it's still running (e.g., player moved into zone before time expired)
            if (this.timerEvent) {
                this.timerEvent.remove(false);
                this.timerEvent = null;
                console.log("Timer stopped manually during checkAnswer.");
            }


            const playerX = this.player.x;
            const playerY = this.player.y;
            let playerZoneIndex = -1; // Default to -1 (no zone)

            // Find which zone the player is in
            for (let i = 0; i < this.answerZones.length; i++) {
                if (Phaser.Geom.Rectangle.Contains(this.answerZones[i], playerX, playerY)) {
                    playerZoneIndex = i;
                    break; // Found the zone, no need to check others
                }
            }

            // If time expired, playerZoneIndex might still be -1 if they weren't in a zone
            if (this.remainingTime <= 0 && playerZoneIndex === -1) {
                 console.log("Time expired, player not in any zone.");
                 // Treat as incorrect if time runs out and player isn't in a zone
            }


            const isCorrect = playerZoneIndex === this.currentCorrectAnswerIndex;

            if (isCorrect) {
                // --- Update Score ---
                const reward = this.quizzes[0].reward || 10; // Get reward, default 10
                this.playerScore += reward;
                console.log('Correct! Score:', this.playerScore);
                this.scoreText.setText('Sats: ' + this.playerScore); // Update score display
                this.feedbackText.setText('Correct!').setColor('#00ff00').setVisible(true);
            } else {
                this.feedbackText.setText('Wrong!').setColor('#ff0000').setVisible(true);
            }

            console.log('Player was in zone:', playerZoneIndex, 'Correct zone:', this.currentCorrectAnswerIndex, 'Result:', isCorrect ? 'CORRECT' : 'INCORRECT');

            // Show feedback
             this.cameras.main.setBackgroundColor(isCorrect ? '#008000' : '#800000'); // Green for correct, Red for incorrect

             // After a delay, load the next question or end the quiz
             this.time.delayedCall(2000, () => {
                 this.cameras.main.setBackgroundColor('#000000'); // Reset background
                 this.feedbackText.setVisible(false); // Hide feedback text

                 this.currentQuizQuestionIndex++; // Move to the next question index

                 // Check if there are more questions in the current quiz (assuming quiz index 0 for now)
                 const currentQuiz = this.quizzes[0]; // Assuming we are always on the first quiz for now
                 if (this.currentQuizQuestionIndex < currentQuiz.questions.length) {
                     // Load the next question
                     this.loadQuestion(0, this.currentQuizQuestionIndex);
                 } else {
                     // Quiz finished
                     console.log("Quiz finished!");
                     this.questionText.setText('Quiz Finished!');
                     this.answerTexts.forEach(text => text.setText('')); // Clear answer texts
                     this.timerText.setText(''); // Clear timer text
                     this.quizIsActive = false; // Keep quiz inactive
                     // TODO: Add logic for what happens after the quiz (e.g., return to map, show score)
                 }
             });
        }
        // --- NPC Interaction Handling ---
        handleNpcInteraction(npc) {
            this.currentNpcInteraction = npc;
            this.interactionPromptText.setVisible(false); // Hide prompt immediately

            if (npc.type === 'knowledge') {
                this.showKnowledgeUI(npc.dataId);
            } else if (npc.type === 'quiz') {
                this.showQuizPromptUI(npc.dataId);
            }
        }

        showKnowledgeUI(lessonId) {
            const lesson = this.lessons.find(l => l.id === lessonId);
            if (!lesson) {
                console.error("Lesson not found:", lessonId);
                return;
            }

            // Update UI elements (assuming container children order: bg, title, content, close)
            this.knowledgeContainer.getAt(1).setText(lesson.title); // Update title
            this.knowledgeContainer.getAt(2).setText(lesson.content); // Update content

            this.knowledgeContainer.setVisible(true);
            this.showingKnowledgeUI = true;

            // Award score/sats if lesson not completed before
            if (!this.completedLessons.has(lessonId)) {
                const reward = lesson.reward || 0;
                this.playerScore += reward;
                this.scoreText.setText('Sats: ' + this.playerScore);
                this.completedLessons.add(lessonId);
                // Optional: Add a temporary text effect for reward
                 const rewardText = this.add.text(this.player.x, this.player.y - 50, `+${reward} Sats!`, { fontSize: '16px', fill: '#00ff00' }).setOrigin(0.5);
                 this.tweens.add({
                     targets: rewardText,
                     y: rewardText.y - 30,
                     alpha: 0,
                     duration: 1500,
                     ease: 'Power1',
                     onComplete: () => { rewardText.destroy(); }
                 });
            } else {
                 // Optional: console.log(`Lesson '${lessonId}' already completed.`);
            }
        }

        showQuizPromptUI(quizId) {
            const quiz = this.quizzes.find(q => q.id === quizId);
            if (!quiz) {
                console.error("Quiz not found for prompt:", quizId); // Keep error logs
                return;
            }

            // Update UI elements (assuming container children order: bg, title, topic, cost, start, close)
            this.quizPromptContainer.getAt(2).setText(`Topic: ${quiz.topic}`); // Update topic
            this.quizPromptContainer.getAt(3).setText(`Cost: ${quiz.cost} Sats`); // Update cost

            this.quizPromptContainer.setVisible(true);
            this.showingQuizPromptUI = true;
        }

        hideAllNpcUI() {
            this.knowledgeContainer.setVisible(false);
            this.quizPromptContainer.setVisible(false);
            this.showingKnowledgeUI = false;
            this.showingQuizPromptUI = false;
            this.currentNpcInteraction = null;
        }

        startQuiz(quizId) {
            const quiz = this.quizzes.find(q => q.id === quizId);
            if (!quiz) {
                console.error("Quiz data not found for starting:", quizId); // Keep error logs
                return;
            }

            const cost = quiz.cost || 0;

            if (this.playerScore >= cost) {
                // Deduct cost
                this.playerScore -= cost;
                this.scoreText.setText('Sats: ' + this.playerScore);

                // Hide prompt UI
                this.hideAllNpcUI();

                // Find the index of the quiz in the main array
                const quizIndex = this.quizzes.findIndex(q => q.id === quizId);
                if (quizIndex === -1) {
                     console.error("Could not find index for quiz:", quizId); // Keep error logs
                     return; // Should not happen if quiz was found earlier
                }

                // Reset question index and load first question
                this.currentQuizQuestionIndex = 0;
                this.loadQuestion(quizIndex, 0);

            } else {
                // Optional: Show temporary "Not enough Sats" message
                const insufficientText = this.add.text(400, 400, 'Not enough Sats!', { fontSize: '18px', fill: '#ff0000', backgroundColor: 'rgba(0,0,0,0.7)' }).setOrigin(0.5);
                this.time.delayedCall(1500, () => {
                    insufficientText.destroy();
                });
            }
        }
    }

    // --- Game Configuration ---
    var config = {
        type: Phaser.WEBGL,
        width: 800,
        height: 600,
        parent: 'game',
        render: {
            pixelArt: true
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false // Set true to see physics bodies and zones
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [GameScene]
    };

    // --- Initialize Game ---
    var game = new Phaser.Game(config);

// deviceready listener and fallback removed for web deployment