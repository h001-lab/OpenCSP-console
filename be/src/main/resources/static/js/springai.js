// ############################################################################
// 텍스트 대화와 관련된 코드
// ############################################################################
window.springai = window.springai || {};

// ##### 사용자 질문을 보여줄 엘리먼트를 채팅 패널에 추가하는 함수 #####
springai.addUserQuestion = function (question, chatPanelId) {
  const html = `
    <div class="d-flex justify-content-end m-2">
      <table>
        <tr>
          <td><img src="/image/user.png" width="30"/></td>
          <td><span>${question}</span></td>
        </tr>
      </table>
    </div>
  `;
  document.getElementById(chatPanelId).innerHTML += html;
  springai.scrollToHeight(chatPanelId);
};

// ##### 응답을 보여줄 엘리먼트를 채팅 패널에 추가하는 함수 #####
springai.addAnswerPlaceHolder = function (chatPanelId) {
  //id-를 붙이는 이유: 숫자로 시작하면 CSS 선택자 문법 에러 날 수 있음
  let uuid = "id-" + crypto.randomUUID();
  let html = `
    <div class="d-flex justify-content-start border-bottom m-2">
      <table>
        <tr>
          <td><img src="/image/assistant.png" width="50"/></td>
          <td><span id="${uuid}"></span></td>
        </tr>
      </table>       
    </div>
  `;
  document.getElementById(chatPanelId).innerHTML += html;
  return uuid;
};

// ##### 텍스트 응답을 출력하는 함수 #####
springai.printAnswerText = async function (responseBody, targetId, chatPanelId) {
  springai.printAnswerStreamText(responseBody, targetId, chatPanelId);
}

// ##### 스트리밍 텍스트 응답을 출력하는 함수 #####
springai.printAnswerStreamText = async function (responseBody, targetId, chatPanelId) {
  const targetElement = document.getElementById(targetId);
  const reader = responseBody.getReader();
  const decoder = new TextDecoder("utf-8");
	let content = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let chunk = decoder.decode(value);
		content += chunk;
		if(!springai.isOpenTagIncomplete(chunk)) {
	    targetElement.innerHTML = content;
		}
    springai.scrollToHeight(chatPanelId);
  }
};

// ##### 태그가 정상적으로 <>으로 구성되어 있는지 체크하는 함수 #####
// innerHTML은 <div 같이 텍스트가 추가되면 무시해버리기 때문에 다음 청크의 >까지
// 결합해서 innerHTML에 추가해야 함
springai.isOpenTagIncomplete = function(str) {
  // 1) 문자열 안에 '<'가 하나라도 있는지 확인
  const lastLt = str.lastIndexOf("<");
  if (lastLt === -1) {
    // '<' 자체가 없으면 “시작은 되지 않은 상태”이므로 false
    return false;
  }
  // 2) 문자열 안에 '>'가 하나라도 있는지 확인
  const lastGt = str.lastIndexOf(">");
  if (lastGt === -1) {
    // '>'가 아예 없으면, '<'만 있는 상태 → 무조건 미완성
    return true;
  }
  // 3) “마지막 '<' 인덱스”가 “마지막 '>' 인덱스”보다 크면
  //    그 이후로 닫힘 기호가 없다는 의미 → 미완성
  return lastLt > lastGt;
};

// ##### JSON을 이쁘게 출력하는 함수 #####
springai.printAnswerJson = async function(jsonString, uuid, chatPanelId) {
  const jsonObject = JSON.parse(jsonString);
  // 들여쓰기를 2로 설정해서 이쁘게 문자열로 만듬
  const prettyJson = JSON.stringify(jsonObject, null, 2);
  document.getElementById(uuid).innerHTML = "<pre>" + prettyJson + "</pre>";
  springai.scrollToHeight(chatPanelId);
};

// ##### 채팅 패널의 스크롤을 제일 아래로 내려주는 함수 #####
springai.scrollToHeight = function (chatPanelId) {
  //DOM 업데이트보다 스크롤 이동이 먼저 되면 안되므로
  //스크롤 이동을 0.1초간 딜레이 시킴
  setTimeout(() => {
    const chatPanelElement = document.getElementById(chatPanelId);
    chatPanelElement.scrollTop = chatPanelElement.scrollHeight;
  }, 100);
};

// ##### 진행중임을 표시하는 함수 #####
springai.setSpinner = function(spinnerId, status) {
  if(status) {
    document.getElementById(spinnerId).classList.remove("d-none");
  } else {
    document.getElementById(spinnerId).classList.add("d-none");
  }
}

// ############################################################################
// 음성 대화와 관련된 코드
// ############################################################################
window.springai.voice = window.springai.voice || {};

// ##### 마이크를 활성화하고 소리 분석 도구 및 녹화 도구를 준비를 하는 함수 #####
springai.voice.initMic = async function (handleVoice) {
  //전역 변수 초기화
  springai.voice.voice = false;              	// 사람의 음성이 입력되면 true 
  springai.voice.chatting = false;           	// 질문하기 시작할 때부터 답변을 받을 때까지 true         
  springai.voice.silenceStart = null;        	// 침묵 시작 시간을 저장
  springai.voice.silenceDelay = 2000;      		// 침묵 지연 시간 2초을 저장하는 상수
  springai.voice.silenceThreshold = 0.01;  		// 침묵인지 판단할 임계상수(0~1 사이의 값) 
  springai.voice.stream = null;               // 마이크 입력 스트림 객체
  springai.voice.analyser = null;             // 소리 분석기 객체
  springai.voice.mediaRecorder = null;        // 음성 녹음기 객체
  springai.voice.recognition = null;          // 음성 인식 객체

  //사용자에게 마이크 접근 권한을 요청하고, 오디오 스트림(MediaStream)을 가져옴
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  springai.voice.stream = stream;

  //침묵이 지속되는지 분석을 위한 코드 ---------------
  //오디오 처리를 위한 AudioContext 생성
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  //마이크에서 들어온 오디오 스트림을 MediaStreamAudioSourceNode로 변환
  const source = audioContext.createMediaStreamSource(stream);
  //오디오 데이터를 실시간으로 분석하는 AnalyserNode를 생성
  springai.voice.analyser = audioContext.createAnalyser();
  //음성 분석을 위한 FFT(빠른 푸리에 변환) 구간 크기 설정
  //클수록 더 정밀한 주파수 분석이 가능하지만 처리 비용이 증가(보통 512, 1024, 2048 사용)
  springai.voice.analyser.fftSize = 2048;
  //오디오 소스를 분석기에 연결
  source.connect(springai.voice.analyser);
  //-----------------------------------------------

  //미디어 녹음기 초기화
  springai.voice.initMediaRecorder(handleVoice);
  //음성 인식 초기화
  springai.voice.initRecognitionVoice();
};

//##### 미디어 녹음기를 초기화하는 함수 #####
springai.voice.initMediaRecorder = function (handleVoice) {
  //오디오 녹음을 위한 MediaRecorder 생성
  const mediaRecorder = new MediaRecorder(springai.voice.stream);
  springai.voice.mediaRecorder = mediaRecorder;

  //침묵으로 인한 음성 녹화가 중지되었을 때, 자동 호출되는 함수 지정
  mediaRecorder.ondataavailable = async (event) => {
    //음성 확인이 되었고, 녹화 데이터가 있고, 현재 대화중이 아닐 경우
    if (springai.voice.voice === true && event.data.size > 0 && springai.voice.chatting === false) {
      console.log("대화 시작");
      springai.voice.chatting = true;

      //MP3로 변환
      const webmBlob = event.data;
      const mp3Blob = await springai.voice.convertWebMToMP3(webmBlob);
      //콜백(사용자 로직) 실행 -------------
      handleVoice(mp3Blob);
      //---------------------------------
    }
    //음성 확인이 안되었거나, 녹화 데이터가 없을 경우
    else {
      mediaRecorder.start();
      springai.voice.checkSilence();
    }
  };

  console.log("음성 녹화 시작");
  mediaRecorder.start();
  console.log("침묵 감시 시작");
  springai.voice.checkSilence();
};

// ##### 마이크 입력로부터 음성 인식을 하는 함수 #####
springai.voice.initRecognitionVoice = function () {
  // 음성 인식 전역 변수 초기화
  springai.voice.voice = false;
  // 음성 인식을 제공하는 SpeechRecognition 생성
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  springai.voice.recognition = recognition;
  // 음성이 한국어일 것이다를 알려주는 힌트 설정(명확한 영어도 인식될 수 있음)
  recognition.lang = 'ko-KR';
  // true: 음성 확인되면 매번 onresult 콜백
  recognition.interimResults = true;
  // false: 음성 확인 후, 몇초간(브라우저 고정값, 1~2초) 침묵이 되면 인식 자동 종료
  recognition.continuous = false;
  // 인식을 시작할 때 콜백되는 함수
  recognition.onstart = function () {
  };
  // 음성 확인되었을 때 콜백되는 함수
  recognition.onresult = function (event) {
    // 변환된 텍스트 얻기(정식 STT로 사용하기에는 인식 정확도 낮음)
    const transcript = event.results[0][0].transcript;
    // 텍스트가 있고, 한글이 포함되어 있을 경우
    if (transcript.length > 0 && springai.voice.isKorean(transcript)) {
      console.log("한국어 음성 확인");
      springai.voice.voice = true;
    }
  };
  // 인식을 종료할 때 콜백되는 함수
  recognition.onend = function () {
    // 브라우저에서 자동 종료시켰을 경우, 재시작 시킴
    if (!springai.voice.voice) {
      recognition.start();
    }
  };

  console.log("음성 인식 시작");
  recognition.start();
};

// ##### 한글이 1개라도 포함되어 있는지 체크하는 함수 #####
springai.voice.isKorean = function (text) {
  const koreanRegex = /[가-힣]/;
  const isKorean = koreanRegex.test(text);
  return isKorean;
};

// ##### 침묵이 지속되는지 체크하는 함수 #####
springai.voice.checkSilence = function () {
  // 분석 결과를 저장할 바이트 배열을 생성
  const dataArray = new Uint8Array(springai.voice.analyser.fftSize);
  // 오디오 파형 데이터를 dataArray에 복사
  // 각 값은 0~255 범위의 8비트 정수이며, 오디오 신호의 진폭을 나타냄
  // 128이 중심(0에 해당), 0 또는 255는 최대 음파 진폭
  springai.voice.analyser.getByteTimeDomainData(dataArray);
  // Uint8Array인 dataArray를 일반 배열로 변환한 뒤, 각 값을 정규화된 부동소수점 형태로 변환
  // 즉, 0~255 범위를 -1.0 ~ +1.0 범위로 바꿈
  const normalized = Array.from(dataArray).map(v => v / 128 - 1);
  // RMS(Root Mean Square) = 정규화된 신호의 제곱 평균 제곱근
  // RMS는 음성 볼륨 크기을 나타내며, 값이 클수록 말소리가 크거나 배경 소음이 심하다는 뜻
  // RMS ≈ 0: 침묵
  // RMS ≈ 1: 최대 볼륨
  const rms = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0) / normalized.length);
  // 음성 볼륨이 침묵 임계상수 보다 작을 경우
  if (rms < springai.voice.silenceThreshold) {
    // 침묵 시작 시간 설정이 되어 있지 않은 경우
    if (!springai.voice.silenceStart) {
      // 침묵 시작 시간 설정
      springai.voice.silenceStart = Date.now();
    }
    // 침묵이 silenceDelay 동안 지속될 경우
    else if ((Date.now() - springai.voice.silenceStart) > springai.voice.silenceDelay) {
      // 음성 녹화 중이라면, 음성 녹화 중지
      if (springai.voice.mediaRecorder.state === 'recording') {
        springai.voice.mediaRecorder.stop();
        springai.voice.recognition.stop();
      }
      // 침묵 시작 시간 없애기
      springai.voice.silenceStart = null;
      return;
    }
  }
  // 음성 볼륨이 침묵 임계상수와 같거나 클 경우
  else {
    // 침묵 시작 시간 없애기
    springai.voice.silenceStart = null;
  }

  // 침묵이 지속되는지 계속 체크: 재귀 호출
  requestAnimationFrame(springai.voice.checkSilence);
};

// ##### WebM Blob을 MP3 Blob으로 변환 #####
// OpenAi의 gpt-4o-mini-audio의 입력은 audio/mp3 또는 audio/wav만 가능
springai.voice.convertWebMToMP3 = async function (webmBlob) {
  // WebM Blob → ArrayBuffer → AudioBuffer(PCM) 디코딩
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuf = await audioCtx.decodeAudioData(arrayBuffer);

  // PCM 데이터 추출 (첫 번째 채널만 사용)
  const float32Data = audioBuf.getChannelData(0);
  const sampleRate = audioBuf.sampleRate;

  // LameJS Mp3Encoder 인스턴스 생성 (채널=1, 샘플레이트, 비트레이트=128kbps)
  const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const samplesPerFrame = 1152;
  let mp3DataChunks = [];

  // Float32 → Int16 변환 함수
  function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  // 프레임 단위 인코딩
  for (let i = 0; i < float32Data.length; i += samplesPerFrame) {
    const sliceF32 = float32Data.subarray(i, i + samplesPerFrame);
    const sliceI16 = floatTo16BitPCM(sliceF32);
    const mp3buf = mp3Encoder.encodeBuffer(sliceI16);
    if (mp3buf.length) mp3DataChunks.push(mp3buf);
  }
  // 남은 버퍼 flush
  const endBuf = mp3Encoder.flush();
  if (endBuf.length) mp3DataChunks.push(endBuf);

  // Blob으로 병합해 반환
  return new Blob(mp3DataChunks, { type: 'audio/mp3' });
};

// ##### 스트리밍 음성 데이터를 재생하는 함수 #####
springai.voice.playAudioFormStreamingData = async function (response, audioPlayer) {
  try {
    // 스트리밍을 위한 미디어소스 생성과 audioPlaye 소스로 설정
    const mediaSource = new MediaSource();
    audioPlayer.src = URL.createObjectURL(mediaSource);

    // 스트림이 열리면 콜백되는 함수 등록
    mediaSource.addEventListener('sourceopen', async () => {
      // 본문의 오디오 데이터 타입을 알려주고 데이터 버퍼 준비
      // MIME 타입은 서버에서 실제 인코딩한 포맷으로 맞춰야 함
      // 예) MP3: 'audio/mpeg', WAV: 'audio/wav'
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      // 응답 본문을 읽는 리더 얻기
      const reader = response.body.getReader();
      // 스트리밍되는 데이터가 있을 동안 반복
      while (true) {
        // 스트리밍 음성 데이터(청크) 읽기
        const { done, value } = await reader.read();
        //스트리밍이 종료될 경우 스트림을 닫고 반복 중지
        if (done) {
          mediaSource.endOfStream();
          break;
        }
        // 스트리밍이 계속 진행 중일 경우
        await new Promise(resolve => {
          // 버퍼 데이터가 갱신 완료될 때마다 핸들러(resolve) 실행, 
          // { once: true }: 핸들러를 한 번만 실행한 후 자동으로 제거
          sourceBuffer.addEventListener('updateend', resolve, { once: true });
          // 버퍼에 데이터 추가
          sourceBuffer.appendBuffer(value);
        });
      }
    });
    // 재생 시작
    audioPlayer.play();
  } catch (error) {
    console.log(error);
  }
};

// ##### 사용자의 질문을 보여줄 엘리먼트를 채팅 패널에 추가하는 함수 #####
springai.voice.addUserQuestionPlaceHolder = function (chatPanelId) {
  //id-를 붙이는 이유: 숫자로 시작하면 CSS 선택자 문법 에러 날 수 있음
  let uuid = "id-" + crypto.randomUUID();
  const questionHtml = `
    <div class="d-flex justify-content-end m-2">            
      <table>
        <tr>
          <td><img src="/image/user.png" width="30"/></td>
          <td>
            <div id="${uuid}-speaker" class="speakerPulse" 
              style="width: 30px; height: 30px; 
              background: url('/image/speaker-yellow.png') no-repeat center center / contain;"></div>
          </td>
          <td><span id="${uuid}"></span></td>
        </tr>
      </table>                      
    </div>
  `;
  document.getElementById(chatPanelId).innerHTML += questionHtml;
  return uuid;
};

//##### AI 답변을 보여줄 엘리먼트를 채팅 패널에 추가하는 함수 #####
springai.voice.addAnswerPlaceHolder = function (chatPanelId) {
  //id-를 붙이는 이유: 숫자로 시작하면 CSS 선택자 문법 에러 날 수 있음
  let uuid = "id-" + crypto.randomUUID();
  let answerHtml = `
    <div class="d-flex justify-content-start border-bottom m-2">         
      <table>
        <tr>
          <td><img src="/image/assistant.png" width="50"/></td>
          <td>
            <div id="${uuid}-speaker" class="speakerPulse" 
              style="width: 30px; height: 30px; 
              background: url('/image/speaker-green.png') no-repeat center center / contain;"></div>
          </td>
          <td><span id="${uuid}"></span></td>
        </tr>
      </table>            
    </div>
  `;
  document.getElementById(chatPanelId).innerHTML += answerHtml;
  return uuid;
};

// ##### 스피커 애니메이션 제어 함수 #####
springai.voice.controlSpeakerAnimation = function (speackerId, flag) {
  if (flag) {
    document.getElementById(speackerId).classList.add("speakerPulse");
  } else {
    document.getElementById(speackerId).classList.remove("speakerPulse");
  }
};

// ############################################################################
// 비전 및 이미지 생성
// ############################################################################
window.springai.vision = window.springai.vision || {};

// ##### 카메라 영상을 보여주는 함수 #####
springai.vision.previewCamera = function(videoId) {
  //<video> 엘리먼트 얻기
  const video = document.getElementById(videoId);
  //카메라를 활성화하고 <video>에서 보여주기
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
    })
    .catch((error) => {
      console.error('카메라 접근 에러:', error);
    });
}

// ##### 카메라 영상에서 프레임을 추출하는 함수 #####
springai.vision.captureFrame = function(videoId, handleFrame) {
  //<video> 엘리먼트 얻기
  const video = document.getElementById(videoId);

  //캔버스를 생성해서 비디오 크기와 동일하게 맞춤
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // 캔버스로부터  2D로 드로잉하는 Context를 얻어냄
  const context = canvas.getContext('2d');

  // 비디오 프레임을 캔버스에 드로잉
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 드로잉된 프레임을 PNG 포맷의 blob 데이터로 얻기
  canvas.toBlob((blob) => {
    handleFrame(blob);
  }, 'image/png');
}

// ##### 마스크 투명 영역의 좌상단 좌표(캔버스 좌상단 기준)와 폭과 높이를 저장하는 변수 선언 #####
springai.vision.selectArea = { x: 0, y: 0, w: 0, h: 0 };

// ##### 마스트 투명 영역이 설정되었는지 체크하는 함수 #####
springai.vision.existTransparentArea = function() {
  if(springai.vision.selectArea.w === 0 && springai.vision.selectArea.h === 0) {
    return false;
  } else {
    return true;
  }
}

// ##### 마스트 투명 영역을 제거하는 함수 #####
springai.vision.clearTransparentArea = function() {
  springai.vision.selectArea = { x: 0, y: 0, w: 0, h: 0 };
}

// ##### 캔버스 초기화 함수 #####
springai.vision.initCanvas = function(imgId, canvasId) {
  // <img>에서 이미지가 로드 완료되었을 때 콜백되는 함수 등록
  // resizeCanvas(): <img>의 크기와 동일한 <canvas>를 만듬
  const img = document.getElementById(imgId);
  img.addEventListener("load", (e) => { springai.vision.resizeCanvas(imgId, canvasId); });

  // window 크기가 변경되었을 때 콜백되는 함수 등록
  // resizeCanvas(): <img>의 크기와 동일한 <canvas>를 만듬
  window.addEventListener("resize", (e) => { springai.vision.resizeCanvas(imgId, canvasId); });

  // <canvas>에서 2d Context를 얻기
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  // 마스크 투명 영역 지정을 위한 마우스 시작 좌표(캔버스 좌상단 기준)
  let startX = 0, startY = 0;

  // 투명 영역을 표시하기 위해 드로잉 중임을 알려주는 변수 선언
  let isDrawing = false;

  // 드래그 시작: 투명 영역 시작 좌표를 얻고, 투명 영역 드로잉 중임을 설정
  canvas.addEventListener("mousedown", e => {
    // <canvas>의 좌상단 좌표와 크기 (뷰포트 좌상단 기준)
    const rect = canvas.getBoundingClientRect();

    // e.clientX, e.clientY는 마우스를 찍은 X, Y 좌표 (뷰포트 좌상단 기준)
    // canvas.width, canvas.height: 실제 해상도의 캔버스의 폭과 길이
    // startX, startY: 실제 해상도에서의 드래스 시작 좌표 (캔버스 좌상단 기준)
    startX = (e.clientX - rect.left) * (canvas.width / rect.width);
    startY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 드로잉 중임을 설정
    isDrawing = true;
  });

  // 드래그 중: 마스크 투명 영역 표시하기
  canvas.addEventListener("mousemove", (e) => {
    // 드로잉 중이 아니면 함수 종료
    if (!isDrawing) return;

    // 실제 해상도 드래그 현재 좌표 얻기
    const rect = canvas.getBoundingClientRect();
    const currX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const currY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 드로잉 전체 영역 지움
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 투명 영역 얻기
    const x = Math.min(startX, currX);
    const y = Math.min(startY, currY);
    const w = Math.abs(currX - startX);
    const h = Math.abs(currY - startY);
    springai.vision.selectArea = { x, y, w, h };

    // 투명 영역을 반투명 하이라이트 처리하기
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x, y, w, h);

    // 투명 영역 흰 테두리 그리기
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  });

  // 드래그 종료: 드로잉이 끝났음을 설정
  canvas.addEventListener("mouseup", e => {
    // 드로잉 중이 아니면 함수 종료
    if (!isDrawing) return;

    // 드로잉 중이면 끝났음을 설정
    isDrawing = false;

    // 투명 영역 콘솔에 출력해보기
    console.log("투명 영역:", springai.vision.selectArea);
  });
};

// ##### 캔버스 크기 조정 함수 #####
springai.vision.resizeCanvas = function(imgId, canvasId) {
  // <img>와 <canvas> 가져오기
  const img = document.getElementById(imgId);
  const canvas = document.getElementById(canvasId);

  //이미지가 로드 완료되지 않았거나, 폭이 없을 경우 함수 종료
  if (!img.complete || img.naturalWidth === 0) return;

  // 캔버스 크기를 이미지의 실제 크기와 동일하게 맞춤
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  // 캔버스 화면 크기를 이미지의 화면 크기와 마춤
  const rect = img.getBoundingClientRect();
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";

  // 캔버스 내부 버퍼 내용을 지움
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// ##### 원본 이미지 미리 보여주는 함수 #####
springai.vision.previewImage = function(fileId, chatPanelId) {
  const file = document.getElementById(fileId).files[0];
  if(file) {
    const uuid = "id-" + crypto.randomUUID();
    const previewHtml = `
      <div class="d-flex justify-content-end m-2">
        <table>
          <tr>
            <td></td>
            <td><img id="${uuid}" src="" alt="미리보기 이미지" height="200"/></span></td>
          </tr>
        </table>
      </div>
    `;
    document.getElementById(chatPanelId).innerHTML += previewHtml;

    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById(uuid);
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
    springai.scrollToHeight(chatPanelId);
  }
};

springai.vision.previewImage2 = function(fileId, imgId) {
  const file = document.getElementById(fileId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(imgId).src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// ##### 원본 이미지 Blob 얻기
springai.vision.getOriginalBlob = function(imgId, fileId) {
  const img = document.getElementById(imgId);
  // Data URL 헤더 분리 (mime 타입과 실제 Base64 데이터)
  const [header, base64Data] = img.src.split(',');
  // mime 타입 추출 (예: "data:image/png;base64")
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mimeType = mimeMatch[1];
  // Base64 → 바이너리 문자열 변환
  const byteString = atob(base64Data);
  // 바이너리 문자열 → Uint8Array 변환
  const len = byteString.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = byteString.charCodeAt(i);
  }
  // Blob 생성
  const originalBlob = new Blob([u8arr], { type: mimeType });
  return originalBlob;
};

// ##### 마스크 이미지 Blob 생성 함수 #####
springai.vision.getMaskBlob = function(canvasId) {
  const canvas = document.getElementById(canvasId);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const ctx = tempCanvas.getContext('2d');

  // 전체 검정
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // 선택 영역만 투명
  const x = Math.round(springai.vision.selectArea.x);
  const y = Math.round(springai.vision.selectArea.y);
  const w = Math.round(springai.vision.selectArea.w);
  const h = Math.round(springai.vision.selectArea.h);
  ctx.clearRect(x, y, w, h);

  return new Promise(resolve => {
    tempCanvas.toBlob(blob => resolve(blob), 'image/png');
  });
};

// ##### 마스크 이미지 다운로드 함수 #####
springai.vision.downloadMaskImage = function(blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'mask.png';
  link.click();
  URL.revokeObjectURL(link.href);
};

// ##### base64 이미지 문자열을 이미지 파일로 다운로드해주는 함수 #####
springai.vision.downloadBase64Image = function(base64Src, filename) {
  const link = document.createElement('a');
  link.href = base64Src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ############################################################################
// 이미지 임베딩과 관련된 코드
// ############################################################################
window.springai.image = window.springai.image || {};

// ##### 멀티 이미지 미리 보여주기 #####
springai.image.previewMultiImages = function(fileId, chatPanelId) {
  const files = document.getElementById(fileId).files;
  let uuidImageContainer = "id-" + crypto.randomUUID();
  let previewHtml = `
    <div class="d-flex justify-content-end m-2">
      <div id="${uuidImageContainer}"></div>
    </div>
  `;
  document.getElementById(chatPanelId).innerHTML += previewHtml;

  for(let i=0; i<files.length; i++) {
    const uuid = "id-" + crypto.randomUUID();
    const previewHtml = `
      <img id="${uuid}" src="" alt="미리보기 이미지" height="100"/>
    `;
    document.getElementById(uuidImageContainer).innerHTML += previewHtml;

    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById(uuid);
      preview.src = e.target.result;
    };
    reader.readAsDataURL(files[i]);
    springai.scrollToHeight(chatPanelId);
  };  
}