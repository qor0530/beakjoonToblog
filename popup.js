// 팝업 UI 동작을 담당하는 스크립트
class PopupController {
    constructor() {
        this.problemData = {};
        this.sourceCode = '';
        this.submissionInfo = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
    }

    bindEvents() {
        // 문제 정보 추출 버튼
        document.getElementById('extractBtn').addEventListener('click', () => {
            this.extractProblemData();
        });

        // 내용 작성 버튼
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generatePostContent();
        });

        // 해설 텍스트 변경 감지
        document.getElementById('solutionText').addEventListener('input', () => {
            this.updateGenerateButton();
        });
    }

    // 저장된 데이터 로드
    loadStoredData() {
        chrome.storage.local.get(['problemData', 'sourceCode'], (result) => {
            if (result.problemData) {
                this.problemData = result.problemData;
                this.updateProblemInfo();
            }
            if (result.sourceCode) {
                this.sourceCode = result.sourceCode;
            }
        });
    }

    // 문제 데이터 추출
    async extractProblemData() {
        this.showStatus('문제 정보를 추출하고 있습니다...', 'info');
        
        try {
            // 현재 활성 탭에서 데이터 추출
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('acmicpc.net')) {
                this.showStatus('백준 사이트에서만 사용할 수 있습니다.', 'error');
                return;
            }

            // content script에 메시지 전송
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
            
            if (response && response.success) {
                this.handleExtractedData(response.data, tab);
            } else {
                this.showStatus('데이터 추출에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('데이터 추출 오류:', error);
            this.showStatus('데이터 추출 중 오류가 발생했습니다.', 'error');
        }
    }

    // 추출된 데이터 처리 (Request 방식)
    async handleExtractedData(data, tab) {
        if (data.pageType === 'status') {
            // status 페이지인 경우 request로 문제 정보 수집
            this.submissionInfo = data.submissionInfo;
            await this.collectProblemInfoFromRequest(data.problemNumber);
            await this.collectSourceCodeFromRequest();
        }
    }

    // request로 문제 정보 수집
    async collectProblemInfoFromRequest(problemNumber) {
        try {
            console.log('=== request로 문제 정보 수집 시작 ===');
            
            // content script에 문제 정보 요청
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'extractProblemInfoFromRequest', 
                problemNumber: problemNumber 
            });
            
            if (response && response.success && response.data) {
                this.problemData = response.data;
                this.updateProblemInfo();
                this.showStatus('문제 정보를 성공적으로 추출했습니다.', 'success');
                console.log('✅ 문제 정보 수집 완료:', this.problemData);
            } else {
                console.log('❌ 문제 정보 수집 실패:', response);
                this.showStatus('문제 정보 추출에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('❌ 문제 정보 수집 오류:', error);
            this.showStatus('문제 정보 수집 중 오류가 발생했습니다.', 'error');
        }
    }

    // request로 소스 코드 수집
    async collectSourceCodeFromRequest() {
        try {
            console.log('=== request로 소스 코드 수집 시작 ===');
            
            if (!this.submissionInfo) {
                console.log('❌ submissionInfo가 없음');
                return;
            }

            // content script에 소스 코드 요청
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'extractSourceCodeFromRequest', 
                sourceUrl: this.submissionInfo.sourceUrl 
            });
            
            if (response && response.success && response.data) {
                this.sourceCode = response.data;
                console.log('✅ 소스 코드 수집 완료 (길이):', this.sourceCode.length);
                this.showStatus('소스 코드를 성공적으로 추출했습니다.', 'success');
            } else {
                console.log('❌ 소스 코드 수집 실패:', response);
            }
        } catch (error) {
            console.error('❌ 소스 코드 수집 오류:', error);
            this.showStatus('소스 코드 수집 중 오류가 발생했습니다.', 'error');
        }
    }

    // 문제 정보 UI 업데이트
    updateProblemInfo() {
        if (this.problemData.title) {
            document.getElementById('problemTitle').textContent = this.problemData.title;
        }
        if (this.problemData.problemNumber) {
            document.getElementById('problemNum').textContent = this.problemData.problemNumber;
        }
    }

    // 생성 버튼 상태 업데이트
    updateGenerateButton() {
        const solutionText = document.getElementById('solutionText').value.trim();
        const generateBtn = document.getElementById('generateBtn');
        
        generateBtn.disabled = !solutionText || !this.problemData.title;
    }

    // 포스팅 내용 생성 및 클립보드 복사
    async generatePostContent() {
        try {
            const language = document.getElementById('language').value;
            const solution = document.getElementById('solutionText').value.trim();
            
            if (!solution) {
                this.showStatus('해설을 작성해주세요.', 'error');
                return;
            }

            // 포스팅 내용 생성
            const postContent = this.createPostContent(language, solution);
            
            // 클립보드에 복사
            await navigator.clipboard.writeText(postContent);
            
            this.showStatus('포스팅 내용이 클립보드에 복사되었습니다!', 'success');
            
            // 저장
            chrome.storage.local.set({
                problemData: this.problemData,
                sourceCode: this.sourceCode
            });
            
        } catch (error) {
            console.error('내용 생성 오류:', error);
            this.showStatus('내용 생성 중 오류가 발생했습니다.', 'error');
        }
    }

    // 포스팅 내용 생성
    createPostContent(language, solution) {
        const title = `[${language}] ${this.problemData.problemNumber} - ${this.problemData.title}`;
        
        let content = `# ${title}\n\n`;
        
        // 문제 정보
        if (this.problemData.description) {
            content += `## 문제\n${this.problemData.description}\n\n`;
        }
        
        if (this.problemData.input) {
            content += `## 입력\n${this.problemData.input}\n\n`;
        }
        
        if (this.problemData.output) {
            content += `## 출력\n${this.problemData.output}\n\n`;
        }
        
        // 해설
        content += `## 해설\n${solution}\n\n`;
        
        // 소스 코드
        if (this.sourceCode) {
            content += `## 소스 코드\n\`\`\`${language.toLowerCase()}\n${this.sourceCode}\n\`\`\``;
        }
        
        return content;
    }

    // 상태 메시지 표시
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        
        // 3초 후 메시지 숨기기
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }, 3000);
    }
}

// 팝업 로드 시 컨트롤러 초기화
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
