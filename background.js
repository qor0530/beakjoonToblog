// 백그라운드 서비스 워커
chrome.runtime.onInstalled.addListener(() => {
    console.log('백준 To Tistory 확장 프로그램이 설치되었습니다.');
});

// 확장 프로그램 아이콘 클릭 시 처리
chrome.action.onClicked.addListener((tab) => {
    // 팝업이 이미 설정되어 있으므로 여기서는 추가 작업 불필요
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTabInfo') {
        // 현재 탭 정보 반환
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                sendResponse({ success: true, tab: tabs[0] });
            } else {
                sendResponse({ success: false, error: '탭을 찾을 수 없습니다.' });
            }
        });
        return true; // 비동기 응답을 위해 true 반환
    }
});

// 백준 사이트에서 확장 프로그램 활성화
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('acmicpc.net')) {
        // 백준 사이트에서 확장 프로그램 활성화
        chrome.action.enable(tabId);
    } else if (tab.url && !tab.url.includes('acmicpc.net')) {
        // 백준 사이트가 아닌 경우 비활성화
        chrome.action.disable(tabId);
    }
});
