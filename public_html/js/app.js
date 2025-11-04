/**
 * AIマップ - Vue.js アプリケーション
 */

const { createApp } = Vue;

createApp({
    data() {
        return {
            // UI状態
            sidebarOpen: false,
            settingsOpen: false,
            chatMinimized: false,

            // チャット関連
            currentThreadId: null,
            chatThreads: [],
            messages: [],
            inputMessage: '',
            isTyping: false,
            isComposing: false, // IME変換中かどうか

            // POI関連
            selectedPoi: null,
            selectedPoiId: null, // 選択中のPOI ID（ハイライト用）
            pois: [],

            // マップ
            mapManager: null,

            // サジェスチョン
            suggestions: [
                { id: 1, text: 'チェーン店以外のイタリアンのお店を探しています。' },
                { id: 2, text: '静かでおしゃれなお店はありませんか。' },
                { id: 3, text: '家族で入りやすいお店はありますか？リーズナブルだと嬉しいです。' }
            ],

            // 設定
            chatTitle: '神戸三宮周辺のお食事をご案内します。',
        };
    },

    async mounted() {
        // LocalStorageから履歴を復元（サイドバーに表示するため）
        this.loadFromLocalStorage();

        // マップの初期化
        await this.initializeMap();

        // 常に新規チャットで開始
        this.createNewChat();

        // リロード時にチャットを最下部にスクロール
        await this.$nextTick();
        this.scrollToBottom();

        // ウィンドウリサイズ時にマップパディングを更新
        window.addEventListener('resize', () => {
            this.updateMapPadding();
        });
    },

    watch: {
        // メッセージが変化したときに自動スクロール
        messages: {
            handler() {
                this.$nextTick(() => {
                    this.scrollToBottom();
                });
            },
            deep: true
        },
        // サイドバーの開閉でマップパディングを更新
        sidebarOpen() {
            this.$nextTick(() => {
                this.updateMapPadding();
            });
        },
        // チャット最小化でマップパディングを更新
        chatMinimized() {
            this.$nextTick(() => {
                this.updateMapPadding();
            });
        },
        // POIモーダルの開閉でマップパディングを更新
        selectedPoi() {
            this.$nextTick(() => {
                this.updateMapPadding();
            });
        }
    },

    methods: {
        /**
         * マップを初期化
         */
        async initializeMap() {
            try {
                // 設定を取得（実際には API から取得する）
                const mapConfig = await this.fetchMapConfig();

                this.mapManager = new MapManager();
                await this.mapManager.initialize(mapConfig.type, mapConfig.config);

                // マーカークリックハンドラを設定
                this.mapManager.onMarkerClick = (poi) => {
                    this.showPoiDetail(poi);
                };

                // 初期パディングを設定
                await this.$nextTick();
                this.updateMapPadding();

            } catch (error) {
                console.error('Failed to initialize map:', error);
            }
        },

        /**
         * マップ設定を取得
         */
        async fetchMapConfig() {
            try {
                const response = await fetch('/api/config.php');
                if (!response.ok) {
                    throw new Error('Failed to fetch map configuration');
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching map config:', error);
                // フォールバック: MapLibreのデフォルト設定
                return {
                    type: 'maplibre',
                    config: {
                        style: 'https://demotiles.maplibre.org/style.json',
                        center: { lat: 35.6812, lng: 139.7671 },
                        zoom: 12
                    }
                };
            }
        },

        /**
         * サイドバーの開閉
         */
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },

        /**
         * 設定パネルの開閉
         */
        toggleSettings() {
            this.settingsOpen = !this.settingsOpen;
        },

        /**
         * 新しいチャットスレッドを作成
         */
        createNewChat() {
            // 一意な番号を生成（既存のスレッド名から最大値を取得）
            let maxNumber = 0;
            this.chatThreads.forEach(thread => {
                const match = thread.name.match(/新しいチャット (\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNumber) maxNumber = num;
                }
            });

            const newThread = {
                id: Date.now(),
                name: `新しいチャット ${maxNumber + 1}`,
                messages: []
            };

            this.chatThreads.unshift(newThread);
            this.selectThread(newThread.id);
            this.sidebarOpen = false;

            // 新規チャット作成時は保存しない（最初のやり取り完了時に保存）
        },

        /**
         * チャットスレッドを選択
         */
        selectThread(threadId) {
            this.currentThreadId = threadId;
            const thread = this.chatThreads.find(t => t.id === threadId);
            if (thread) {
                this.messages = thread.messages;
            }
        },

        /**
         * チャットスレッドを切り替え（サイドバーから）
         */
        switchThread(threadId) {
            console.log('[Thread] Switching to thread:', threadId);
            this.selectThread(threadId);
            this.sidebarOpen = false;

            // 選択中のPOIをリセット
            this.selectedPoiId = null;

            // スレッド切り替え時にPOIを復元
            this.restorePoisToMap();
        },

        /**
         * スレッドを削除
         */
        deleteThread(threadId) {
            console.log('[Thread] Deleting thread:', threadId);

            // スレッドを削除
            const index = this.chatThreads.findIndex(t => t.id === threadId);
            if (index === -1) return;

            this.chatThreads.splice(index, 1);

            // LocalStorageに保存（削除を反映）
            this.saveToLocalStorage();

            // 削除したスレッドが現在選択中の場合
            if (this.currentThreadId === threadId) {
                // 他のスレッドがあれば最初のスレッドに切り替え
                if (this.chatThreads.length > 0) {
                    this.switchThread(this.chatThreads[0].id);
                } else {
                    // スレッドがなければ新規作成（保存はしない）
                    this.createNewChat();
                }
            }
        },

        /**
         * サジェスチョンを送信
         */
        sendSuggestion(text) {
            this.inputMessage = text;
            this.sendMessage();
        },

        /**
         * Enterキー押下時の処理
         */
        handleEnterKey(event) {
            // IME変換中は送信しない
            if (this.isComposing) {
                return;
            }

            // 変換中でなければ送信
            event.preventDefault();
            this.sendMessage();
        },

        /**
         * メッセージを送信
         */
        async sendMessage() {
            if (!this.inputMessage.trim() || this.isTyping) return;

            const userMessage = {
                id: Date.now(),
                role: 'user',
                content: this.inputMessage,
                typing: false
            };

            this.messages.push(userMessage);
            const messageText = this.inputMessage;
            this.inputMessage = '';

            // アシスタントのタイピングインジケーター
            const assistantMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: '',
                typing: true
            };
            this.messages.push(assistantMessage);
            this.isTyping = true;

            try {
                // SSEでストリーミング受信
                await this.streamChatResponse(messageText, assistantMessage);

                // 現在のスレッドを更新
                const thread = this.chatThreads.find(t => t.id === this.currentThreadId);
                if (thread) {
                    thread.messages = [...this.messages];
                    // スレッド名を更新（最初のメッセージから）
                    if (thread.messages.length === 2) {
                        thread.name = messageText.substring(0, 30) + '...';
                    }
                    console.log('[Thread] Updated thread messages, last message has POIs:',
                        !!thread.messages[thread.messages.length - 1].pois);
                }

                // LocalStorageに保存
                this.saveToLocalStorage();

            } catch (error) {
                console.error('Failed to send message:', error);
                assistantMessage.content = 'エラーが発生しました。もう一度お試しください。';
                assistantMessage.typing = false;
            }

            this.isTyping = false;
        },

        /**
         * SSEでチャット応答をストリーミング受信
         */
        async streamChatResponse(message, assistantMessage) {
            return new Promise(async (resolve, reject) => {
                let fullResponse = '';
                let buffer = '';
                let currentEvent = '';

                try {
                    // fetchでSSEストリーミングを受信
                    const response = await fetch('/api/chat.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: message,
                            history: this.messages.slice(0, -1).map(m => ({
                                role: m.role,
                                content: m.content
                            }))
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');

                        // 最後の行が不完全な可能性があるので保持
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.trim()) {
                                // 空行はイベントの区切り
                                currentEvent = '';
                                continue;
                            }

                            if (line.startsWith('event: ')) {
                                currentEvent = line.slice(7).trim();
                                console.log('[SSE] Event type:', currentEvent);
                            } else if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                console.log('[SSE] Data received:', data.substring(0, 100));

                                if (currentEvent === 'done') {
                                    assistantMessage.typing = false;

                                    // POIデータを抽出
                                    const poiMarker = '---POI_DATA---';
                                    const poiIndex = fullResponse.indexOf(poiMarker);

                                    if (poiIndex !== -1) {
                                        // POIデータがある場合
                                        const messageText = fullResponse.substring(0, poiIndex).trim();
                                        const poiJson = fullResponse.substring(poiIndex + poiMarker.length).trim();

                                        assistantMessage.content = messageText;

                                        try {
                                            const poiData = JSON.parse(poiJson);
                                            if (poiData.pois && poiData.pois.length > 0) {
                                                // メッセージにPOI情報を保存
                                                assistantMessage.pois = poiData.pois;
                                                console.log('[POI] Saved POIs to message:', poiData.pois.length, 'items');
                                                this.addPoisToMap(poiData.pois);
                                            }
                                        } catch (err) {
                                            console.warn('Failed to parse POI data:', err);
                                        }
                                    } else {
                                        // POIデータがない場合はそのまま表示
                                        assistantMessage.content = fullResponse;
                                    }

                                    resolve();
                                    return;
                                } else if (currentEvent === 'error') {
                                    try {
                                        const errorData = JSON.parse(data);
                                        reject(new Error(errorData.message || 'Server error'));
                                    } catch (e) {
                                        reject(new Error('Server error'));
                                    }
                                    return;
                                } else if (currentEvent === 'message') {
                                    // ストリーミング中のメッセージ
                                    try {
                                        const parsed = JSON.parse(data);
                                        console.log('[SSE] Parsed message:', parsed);
                                        if (parsed.text) {
                                            fullResponse += parsed.text;
                                            console.log('[SSE] Full response length:', fullResponse.length);
                                            console.log('[SSE] Current content:', fullResponse.substring(0, 50));

                                            // POIデータマーカー以降は表示しない
                                            const poiMarker = '---POI_DATA---';
                                            const poiIndex = fullResponse.indexOf(poiMarker);
                                            const displayContent = poiIndex !== -1
                                                ? fullResponse.substring(0, poiIndex).trim()
                                                : fullResponse;

                                            // Vueのリアクティビティを確実にトリガー
                                            // ストリーミング中なのでtypingはtrueのまま
                                            // Vue.set()の代わりに、配列を更新してリアクティビティをトリガー
                                            const index = this.messages.findIndex(m => m.id === assistantMessage.id);
                                            if (index !== -1) {
                                                this.messages[index].content = displayContent;
                                                // 強制的に配列を再割り当てしてリアクティビティをトリガー
                                                this.messages = [...this.messages];
                                            }
                                            console.log('[SSE] Message updated, typing:', assistantMessage.typing, 'content length:', displayContent.length);
                                        }
                                    } catch (e) {
                                        console.error('[SSE] Failed to parse message data:', e, 'Raw data:', data);
                                    }
                                }
                            }
                        }
                    }

                    assistantMessage.typing = false;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        },

        /**
         * POIをマップに追加
         */
        addPoisToMap(pois) {
            if (!this.mapManager) {
                console.warn('[POI] MapManager not initialized');
                return;
            }

            console.log('[POI] Received POIs:', pois.length, 'items');

            // 既存のマーカーをクリア
            this.mapManager.clearMarkers();

            // POIデータを変換（DCP形式からMapManager形式へ）
            const transformedPois = pois.map((poi, index) => {
                // DCPのPOI構造を変換
                const transformed = {
                    id: poi.poi_id || poi.id,
                    name: poi.name,
                    latitude: poi.location?.latitude || poi.latitude,
                    longitude: poi.location?.longitude || poi.longitude,
                    description: poi.description || '',
                    address: poi.address || '',
                    category: poi.category || '',
                    tags: poi.tags || []
                };
                console.log(`[POI] Transformed ${index}:`, {
                    name: transformed.name,
                    lat: transformed.latitude,
                    lng: transformed.longitude
                });
                return transformed;
            });

            // 新しいPOIを追加（座標が有効なもののみ）
            const validPois = [];
            transformedPois.forEach(poi => {
                if (poi.latitude && poi.longitude) {
                    this.mapManager.addMarker(poi);
                    validPois.push(poi);
                } else {
                    console.warn('[POI] Invalid coordinates for:', poi.name);
                }
            });

            console.log(`[POI] Added ${validPois.length}/${transformedPois.length} markers to map`);

            // 座標が有効なPOIが収まるように表示を調整
            if (validPois.length > 0) {
                // 現在のUI状態に応じたパディングを計算
                const padding = this.calculateMapPadding();
                this.mapManager.fitBounds(validPois, padding);
            }

            this.pois = transformedPois;
        },

        /**
         * POI詳細を表示
         */
        async showPoiDetail(poi) {
            console.log('[POI] Opening detail for:', poi);

            // まず基本情報を表示
            this.selectedPoi = {
                ...poi,
                loading: true,
                detailLoaded: false
            };

            // DCP APIから詳細情報を取得
            try {
                const poiId = poi.id || poi.poi_id;
                if (!poiId) {
                    console.error('[POI] No POI ID found');
                    this.selectedPoi.loading = false;
                    return;
                }

                console.log('[POI] Fetching detail for ID:', poiId);
                const response = await fetch(`/api/poi-detail.php?poi_id=${encodeURIComponent(poiId)}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const detailData = await response.json();
                console.log('[POI] Detail data received:', detailData);

                // DCP APIのレスポンス構造に対応
                const poiDetail = detailData.success && detailData.data && detailData.data.poi
                    ? detailData.data.poi
                    : detailData;

                // 詳細情報をマージ
                this.selectedPoi = {
                    ...this.selectedPoi,
                    ...poiDetail,
                    loading: false,
                    detailLoaded: true
                };
            } catch (error) {
                console.error('[POI] Failed to fetch detail:', error);
                this.selectedPoi.loading = false;
                this.selectedPoi.error = '詳細情報の取得に失敗しました';
            }
        },

        /**
         * POI詳細を閉じる
         */
        closePoi() {
            this.selectedPoi = null;
        },

        /**
         * 地図上の特定の位置にズーム
         */
        zoomToLocation(latitude, longitude) {
            if (!this.mapManager || !latitude || !longitude) return;

            console.log('[Map] Zooming to:', latitude, longitude);

            // モーダルを閉じる
            this.closePoi();

            // 地図の中心を移動してズーム
            if (this.mapManager.map) {
                switch (this.mapManager.mapType) {
                    case 'mapbox':
                    case 'maplibre':
                        this.mapManager.map.flyTo({
                            center: [longitude, latitude],
                            zoom: 16,
                            duration: 1500
                        });
                        break;

                    case 'googlemaps':
                        this.mapManager.map.setCenter({ lat: latitude, lng: longitude });
                        this.mapManager.map.setZoom(16);
                        break;
                }
            }
        },

        /**
         * POIカードをクリックして地図にズーム
         */
        zoomToPoi(poi) {
            if (!poi) return;

            const latitude = poi.location?.latitude || poi.latitude;
            const longitude = poi.location?.longitude || poi.longitude;
            const poiId = poi.poi_id || poi.id;

            if (latitude && longitude) {
                console.log('[POI] Selecting POI:', poi.name);

                // 選択中のPOI IDを更新（ハイライト用）
                this.selectedPoiId = poiId;

                // クリックした瞬間にポップアップを開く
                if (this.mapManager && poiId) {
                    this.mapManager.openMarkerPopup(poiId);
                }

                // 地図を移動
                this.zoomToLocation(latitude, longitude);
            } else {
                console.warn('[POI] No coordinates found for POI:', poi);
            }
        },

        /**
         * ファイルを添付
         */
        attachFile() {
            // TODO: ファイル添付機能を実装
            console.log('Attach file');
        },

        /**
         * テーマを切り替え
         */
        toggleTheme() {
            // TODO: ダークモード対応
            console.log('Toggle theme');
        },

        /**
         * 言語を切り替え
         */
        toggleLanguage() {
            // TODO: 多言語対応
            console.log('Toggle language');
        },

        /**
         * ヘルプを表示
         */
        showHelp() {
            // TODO: ヘルプページを表示
            console.log('Show help');
        },

        /**
         * メッセージをフォーマット（マークダウン風）
         */
        formatMessage(text) {
            if (!text) return '';

            // HTMLエスケープ
            let formatted = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // 改行を<br>に変換
            formatted = formatted.replace(/\n/g, '<br>');

            // 太字 **text** を <strong>text</strong> に変換
            formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // イタリック *text* を <em>text</em> に変換
            formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

            // インラインコード `code` を <code>code</code> に変換
            formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

            return formatted;
        },

        /**
         * LocalStorageにチャット履歴を保存
         */
        saveToLocalStorage() {
            try {
                // メッセージが空のスレッドは保存しない
                const threadsToSave = this.chatThreads.filter(thread => thread.messages.length > 0);

                // デバッグ：保存するスレッドの詳細をログ出力
                console.log('[Storage] Total threads:', this.chatThreads.length);
                this.chatThreads.forEach((thread, index) => {
                    console.log(`  Thread ${index}: "${thread.name}", messages: ${thread.messages.length}`);
                });
                console.log('[Storage] Saving', threadsToSave.length, 'threads:');
                threadsToSave.forEach((thread, index) => {
                    console.log(`  Save ${index}: "${thread.name}"`);
                });

                const data = {
                    chatThreads: threadsToSave,
                    currentThreadId: this.currentThreadId,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('aimap_chat_history', JSON.stringify(data));
            } catch (error) {
                console.error('[Storage] Failed to save chat history:', error);
            }
        },

        /**
         * LocalStorageからチャット履歴を復元
         */
        loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('aimap_chat_history');
                if (saved) {
                    const data = JSON.parse(saved);
                    this.chatThreads = data.chatThreads || [];
                    this.currentThreadId = data.currentThreadId;
                    console.log('[Storage] Chat history loaded:', this.chatThreads.length, 'threads');

                    // デバッグ: 各スレッドのPOI情報を確認
                    this.chatThreads.forEach((thread, index) => {
                        const poisCount = thread.messages.filter(m => m.pois && m.pois.length > 0).length;
                        console.log(`[Storage] Thread ${index} has ${poisCount} messages with POIs`);
                    });
                }
            } catch (error) {
                console.error('[Storage] Failed to load chat history:', error);
                this.chatThreads = [];
            }
        },

        /**
         * LocalStorageのチャット履歴をクリア
         */
        clearLocalStorage() {
            try {
                localStorage.removeItem('aimap_chat_history');
                console.log('[Storage] Chat history cleared');
            } catch (error) {
                console.error('[Storage] Failed to clear chat history:', error);
            }
        },

        /**
         * 現在のスレッドのPOIをマップに復元
         */
        restorePoisToMap() {
            if (!this.mapManager) {
                console.warn('[Map] MapManager not initialized');
                return;
            }

            if (!this.messages) {
                console.warn('[Map] No messages to restore POIs from');
                return;
            }

            console.log('[Map] Restoring POIs from current thread, messages:', this.messages.length);

            // 現在のスレッドのすべてのメッセージからPOIを収集
            const allPois = [];
            this.messages.forEach((message, index) => {
                console.log(`[Map] Message ${index}:`, message.role, 'has pois:', !!message.pois);
                if (message.pois && Array.isArray(message.pois)) {
                    console.log(`[Map] Message ${index} POI count:`, message.pois.length);
                    allPois.push(...message.pois);
                }
            });

            // POIが見つかった場合、マップに表示
            if (allPois.length > 0) {
                console.log('[Map] Restoring', allPois.length, 'POIs:', allPois);
                this.addPoisToMap(allPois);
            } else {
                // POIがない場合はマーカーをクリア
                this.mapManager.clearMarkers();
                console.log('[Map] No POIs to restore - clearing markers');
            }
        },

        /**
         * チャットを最下部にスクロール
         */
        scrollToBottom() {
            // 非同期処理とトランジションを考慮して少し遅延させる
            this.$nextTick(() => {
                setTimeout(() => {
                    const messagesContainer = document.querySelector('.messages-container');
                    if (messagesContainer) {
                        // スムーズスクロールで確実に最下部へ
                        messagesContainer.scrollTo({
                            top: messagesContainer.scrollHeight,
                            behavior: 'smooth'
                        });
                        console.log('[Chat] Scrolled to bottom, scrollHeight:', messagesContainer.scrollHeight);

                        // さらに少し遅延させて確実に最下部に到達
                        setTimeout(() => {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }, 150);
                    }
                }, 100); // 100ms遅延
            });
        },

        /**
         * 現在のUI状態に応じたマップパディングを計算
         */
        calculateMapPadding() {
            const isMobile = window.innerWidth < 640; // sm breakpoint
            let padding = { top: 80, bottom: 80, left: 80, right: 80 };

            // サイドバーが開いている場合（左側にパディング）
            if (this.sidebarOpen) {
                padding.left = isMobile ? 256 + 32 : 288 + 32; // w-64 = 256px, w-72 = 288px
            }

            // チャットが開いている場合（右下にパディング）
            if (!this.chatMinimized) {
                if (isMobile) {
                    // スマホ: チャットは右下の隅に配置（幅340px、高さ45vh、bottom: 16px, right: 16px）
                    // 右下の隅配置なので、下パディングのみ調整し、右パディングは最小限
                    padding.right = 80; // 基本的な余白のみ（チャットは右端なので大きなパディング不要）
                    padding.bottom = Math.max(window.innerHeight * 0.45 + 32, padding.bottom);
                } else {
                    // PC: チャットは右下に配置（幅380px、高さ480px、bottom: 16px, right: 16px）
                    // 右側のみにパディングを追加
                    padding.right = 380 + 48;
                    // チャットは画面右下に固定配置されているため、
                    // 下パディングはチャットの実際の配置を考慮して最小限に
                    // （マップの中心が上に寄らないように）
                    padding.bottom = 120; // 基本的な余白のみ
                }
            }

            // POIモーダルが開いている場合（下側にパディング）
            if (this.selectedPoi) {
                if (isMobile) {
                    padding.bottom = Math.max(window.innerHeight * 0.5 + 32, padding.bottom);
                } else {
                    // PC: POIモーダルは画面下部から60vhなので、その分だけパディング
                    padding.bottom = Math.max(window.innerHeight * 0.6 + 32, padding.bottom);
                }
            }

            return padding;
        },

        /**
         * マップのパディングを更新（UIウィンドウに隠れないように）
         */
        updateMapPadding() {
            if (!this.mapManager || !this.mapManager.map) {
                return;
            }

            const padding = this.calculateMapPadding();
            console.log('[Map] Updating padding:', padding);

            // マップタイプに応じてパディングを適用
            switch (this.mapManager.mapType) {
                case 'mapbox':
                case 'maplibre':
                    this.mapManager.map.easeTo({
                        padding: padding,
                        duration: 300
                    });
                    break;

                case 'googlemaps':
                    // Google Mapsの場合は中心をずらす方式で対応
                    // （paddingオプションはfitBoundsなどでのみ使用可能）
                    console.log('[Map] Google Maps padding adjustment not fully implemented');
                    break;
            }
        }
    }
}).mount('#app');
