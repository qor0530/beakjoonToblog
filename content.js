// 백준 페이지에서 데이터를 추출하는 스크립트
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

    // problem 페이지에서 문제 정보 추출
    async extractProblemInfo() {
        try {
            // 문제 제목
            const titleElement = document.querySelector('#problem_title');
            const title = titleElement ? titleElement.textContent.trim() : '';

            // 문제 설명
            const descriptionElement = document.querySelector('#problem_description');
            const description = descriptionElement ? descriptionElement.textContent.trim() : '';

            // 입력/출력 조건
            const inputElement = document.querySelector('#problem_input');
            const input = inputElement ? inputElement.textContent.trim() : '';

            const outputElement = document.querySelector('#problem_output');
            const output = outputElement ? outputElement.textContent.trim() : '';

            // 제한 사항
            const limitElements = document.querySelectorAll('.limit');
            const limits = Array.from(limitElements).map(el => el.textContent.trim());

            this.problemData = {
                title,
                description,
                input,
                output,
                limits
            };

            return this.problemData;
        } catch (error) {
            console.error('문제 정보 추출 중 오류:', error);
            return null;
        }
    }

    // 소스 코드 페이지에서 코드 추출 (textarea 방식)
    extractSourceCode() {
        try {
            console.log('=== 소스 코드 추출 시작 ===');
            console.log('현재 페이지 URL:', window.location.href);
            console.log('현재 페이지 제목:', document.title);
            
            // 방법 1: textarea에서 직접 추출 (가장 확실한 방법)
            const textareaElement = document.querySelector('textarea[name="source"]');
            console.log('찾은 textarea 요소:', textareaElement);
            
            if (textareaElement) {
                console.log('textarea value 길이:', textareaElement.value.length);
                console.log('textarea value 내용:', textareaElement.value);
                
                this.sourceCode = textareaElement.value;
                console.log('✅ textarea에서 추출된 코드:', this.sourceCode);
                return this.sourceCode;
            }
            
            console.log('❌ textarea를 찾을 수 없음, CodeMirror 방식 시도...');
            
            // 방법 2: CodeMirror 구조에서 코드 추출
            const codeMirrorLines = document.querySelectorAll('.CodeMirror-line');
            console.log('찾은 CodeMirror 라인 수:', codeMirrorLines.length);
            
            if (codeMirrorLines.length > 0) {
                let code = '';
                
                codeMirrorLines.forEach((line, index) => {
                    // 각 줄의 텍스트 내용 추출
                    const lineText = line.textContent || line.innerText;
                    console.log(`라인 ${index + 1}:`, lineText);
                    
                    if (lineText && lineText.trim() !== '') {
                        code += lineText + '\n';
                    }
                });
                
                this.sourceCode = code.trim();
                console.log('✅ CodeMirror에서 추출된 코드:', this.sourceCode);
                return this.sourceCode;
            }
            
            console.log('❌ CodeMirror 라인을 찾을 수 없음, 기존 방식 시도...');
            
            // 방법 3: 기존 방식도 시도
            const codeElement = document.querySelector('#source');
            console.log('찾은 #source 요소:', codeElement);
            
            if (codeElement) {
                this.sourceCode = codeElement.textContent;
                console.log('✅ 기존 방식으로 추출된 코드:', this.sourceCode);
                return this.sourceCode;
            }
            
            console.log('❌ 어떤 방식으로도 코드를 찾을 수 없음');
            console.log('페이지의 모든 textarea:', document.querySelectorAll('textarea'));
            console.log('페이지의 모든 pre 요소:', document.querySelectorAll('pre'));
            
            return null;
        } catch (error) {
            console.error('❌ 소스 코드 추출 중 오류:', error);
            return null;
        }
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

    // 전체 데이터 수집
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
        } else if (pageType === 'problem') {
            const problemInfo = await this.extractProblemInfo();
            return { problemInfo, pageType };
        } else if (pageType === 'source') {
            const sourceCode = this.extractSourceCode();
            return { sourceCode, pageType };
        }

        return null;
    }
}

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
        const extractor = new BaekjoonDataExtractor();
        extractor.collectAllData().then(data => {
            sendResponse({ success: true, data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // 비동기 응답을 위해 true 반환
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
