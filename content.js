// 백준 페이지에서 데이터를 추출하는 스크립트 (Request 방식)
class BaekjoonDataExtractor {
    constructor() {
        this.problemData = {};
        this.sourceCode = '';
    }

    // 현재 페이지 타입 감지
    detectPageType() {
        const url = window.location.href;
        if (url.includes('/status')) {
            return 'status';
        } else if (url.includes('/problem/')) {
            return 'problem';
        } else if (url.includes('/source/')) {
            return 'source';
        }
        return 'unknown';
    }

    // status 페이지에서 문제 번호 추출
    extractProblemNumberFromStatus() {
        const url = window.location.href;
        const match = url.match(/problem_id=(\d+)/);
        if (match) {
            return match[1];
        }
        return null;
    }

    // status 페이지에서 제출 번호와 소스 링크 찾기
    async findSubmissionInfo() {
        try {
            // 제출 현황 테이블에서 첫 번째 행 (가장 최근 제출) 찾기
            const submissionRow = document.querySelector('table tbody tr');
            if (!submissionRow) {
                return null;
            }

            // 제출 번호 추출 (소스 링크에서)
            const sourceLink = submissionRow.querySelector('a[href*="/source/"]');
            if (!sourceLink) {
                return null;
            }

            const submissionId = sourceLink.href.split('/source/')[1];
            const sourceUrl = sourceLink.href;

            return {
                submissionId,
                sourceUrl
            };
        } catch (error) {
            console.error('제출 정보 찾기 중 오류:', error);
            return null;
        }
    }

    // request로 HTML 요청하여 문제 정보 추출
    async extractProblemInfoFromRequest(problemNumber) {
        try {
            console.log(`문제 ${problemNumber} 정보 요청 중...`);
            
            const response = await fetch(`https://www.acmicpc.net/problem/${problemNumber}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 문제 제목
            const titleElement = doc.querySelector('#problem_title');
            const title = titleElement ? titleElement.textContent.trim() : '';

            // 문제 설명
            const descriptionElement = doc.querySelector('#problem_description');
            const description = descriptionElement ? descriptionElement.textContent.trim() : '';

            // 입력/출력 조건
            const inputElement = doc.querySelector('#problem_input');
            const input = inputElement ? inputElement.textContent.trim() : '';

            const outputElement = doc.querySelector('#problem_output');
            const output = outputElement ? outputElement.textContent.trim() : '';

            // 제한 사항
            const limitElements = doc.querySelectorAll('.limit');
            const limits = Array.from(limitElements).map(el => el.textContent.trim());

            const problemData = {
                problemNumber,
                title,
                description,
                input,
                output,
                limits
            };

            console.log('✅ 문제 정보 추출 성공:', problemData);
            return problemData;
        } catch (error) {
            console.error('❌ 문제 정보 추출 중 오류:', error);
            return null;
        }
    }

    // request로 HTML 요청하여 소스 코드 추출
    async extractSourceCodeFromRequest(sourceUrl) {
        try {
            console.log(`소스 코드 요청 중: ${sourceUrl}`);
            
            const response = await fetch(sourceUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // textarea에서 직접 추출
            const textareaElement = doc.querySelector('textarea[name="source"]');
            if (textareaElement) {
                const sourceCode = textareaElement.value;
                console.log('✅ 소스 코드 추출 성공 (길이):', sourceCode.length);
                return sourceCode;
            }

            console.log('❌ textarea를 찾을 수 없음');
            return null;
        } catch (error) {
            console.error('❌ 소스 코드 추출 중 오류:', error);
            return null;
        }
    }

    // 전체 데이터 수집 (Request 방식)
    async collectAllData() {
        const pageType = this.detectPageType();
        
        if (pageType === 'status') {
            const problemNumber = this.extractProblemNumberFromStatus();
            const submissionInfo = await this.findSubmissionInfo();
            
            if (problemNumber && submissionInfo) {
                return { 
                    problemNumber, 
                    submissionInfo,
                    pageType 
                };
            }
        }

        return null;
    }
}

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('메시지 수신:', request);
    
    if (request.action === 'extractData') {
        const extractor = new BaekjoonDataExtractor();
        extractor.collectAllData().then(data => {
            sendResponse({ success: true, data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // 비동기 응답을 위해 true 반환
    }
    
    if (request.action === 'extractProblemInfoFromRequest') {
        const extractor = new BaekjoonDataExtractor();
        extractor.extractProblemInfoFromRequest(request.problemNumber).then(data => {
            sendResponse({ success: true, data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    
    if (request.action === 'extractSourceCodeFromRequest') {
        const extractor = new BaekjoonDataExtractor();
        extractor.extractSourceCodeFromRequest(request.sourceUrl).then(data => {
            sendResponse({ success: true, data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

// 즉시 실행되는 로그
console.log('=== 백준 To Tistory Content Script 로드됨 ===');
console.log('현재 페이지 URL:', window.location.href);
console.log('현재 시간:', new Date().toISOString());

// 페이지 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded 이벤트 발생 ===');
    console.log('백준 데이터 추출기 로드됨');
    console.log('현재 페이지 URL:', window.location.href);
    console.log('페이지 타입:', new BaekjoonDataExtractor().detectPageType());
});

// 페이지 로드 후에도 실행 (SPA 대응)
window.addEventListener('load', () => {
    console.log('=== load 이벤트 발생 ===');
    console.log('페이지 완전 로드됨');
    console.log('현재 페이지 URL:', window.location.href);
    console.log('페이지 타입:', new BaekjoonDataExtractor().detectPageType());
});

// 추가 이벤트 리스너
document.addEventListener('readystatechange', () => {
    console.log('=== readystatechange 이벤트 발생 ===');
    console.log('readyState:', document.readyState);
});
