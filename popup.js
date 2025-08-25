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

    // 추출된 데이터 처리
    async handleExtractedData(data, tab) {
        if (data.pageType === 'status') {
            // status 페이지인 경우 문제 페이지로 이동하여 정보 수집
            await this.collectProblemInfo(data.problemNumber, tab);
            // 제출 정보도 저장
            this.submissionInfo = data.submissionInfo;
        } else if (data.pageType === 'problem') {
            // problem 페이지인 경우 문제 정보 저장
            this.problemData = data.problemInfo;
            this.updateProblemInfo();
            this.showStatus('문제 정보를 성공적으로 추출했습니다.', 'success');
        } else if (data.pageType === 'source') {
            // source 페이지인 경우 소스 코드 저장
            this.sourceCode = data.sourceCode;
            this.showStatus('소스 코드를 성공적으로 추출했습니다.', 'success');
        }

        // 소스 코드 수집 시도
        if (this.submissionInfo) {
            console.log('submissionInfo 확인:', this.submissionInfo);
            await this.collectSourceCode(tab);
        } else {
            console.log('❌ submissionInfo가 없음');
        }
    }

    // 문제 정보 수집
    async collectProblemInfo(problemNumber, tab) {
        try {
            // 문제 페이지로 이동
            const problemUrl = `https://www.acmicpc.net/problem/${problemNumber}`;
            await chrome.tabs.update(tab.id, { url: problemUrl });
            
            // 페이지 로드 대기
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 문제 정보 추출
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
            if (response && response.success && response.data.problemInfo) {
                this.problemData = response.data.problemInfo;
                this.problemData.problemNumber = problemNumber;
                this.updateProblemInfo();
                this.showStatus('문제 정보를 성공적으로 추출했습니다.', 'success');
            }
        } catch (error) {
            console.error('문제 정보 수집 오류:', error);
        }
    }

    // 소스 코드 수집
    async collectSourceCode(tab) {
        try {
            console.log('=== collectSourceCode 시작 ===');
            console.log('submissionInfo:', this.submissionInfo);
            
            if (!this.submissionInfo) {
                console.log('❌ submissionInfo가 없음');
                return;
            }

            // 소스 코드 페이지로 직접 이동
            const sourceUrl = this.submissionInfo.sourceUrl;
            console.log('소스 코드 페이지로 이동:', sourceUrl);
            await chrome.tabs.update(tab.id, { url: sourceUrl });
            
            // 페이지 로드 대기
            console.log('페이지 로드 대기 중... (2초)');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 소스 코드 추출
            console.log('소스 코드 추출 시도...');
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
            console.log('extractData 응답:', response);
            
            if (response && response.success && response.data.sourceCode) {
                this.sourceCode = response.data.sourceCode;
                console.log('✅ 소스 코드 추출 성공:', this.sourceCode);
                this.showStatus('소스 코드를 성공적으로 추출했습니다.', 'success');
            } else {
                console.log('❌ 소스 코드 추출 실패:', response);
            }
            
            // 소스 코드 추출 완료 후 내 제출 상세 페이지로 돌아가기
            console.log('내 제출 상세 페이지로 돌아가는 중...');
            const submissionUrl = this.submissionInfo.sourceUrl;
            await chrome.tabs.update(tab.id, { url: submissionUrl });
            
            this.showStatus('내 제출 상세 페이지로 돌아갔습니다.', 'info');
            
        } catch (error) {
            console.error('❌ 소스 코드 수집 오류:', error);
            this.showStatus('소스 코드 추출에 실패했습니다.', 'error');
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
