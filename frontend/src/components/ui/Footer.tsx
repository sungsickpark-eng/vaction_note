export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 text-xs py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-gray-500 font-semibold mb-3 text-sm">여행 일지 다이어리</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-1">
          <span><span className="text-gray-500">대표자</span> 박성식</span>
          <span><span className="text-gray-500">사업자등록번호</span> 737-05-04082</span>
          <span><span className="text-gray-500">통신판매업 신고번호</span> 제 2026-서울은평-0635호</span>
          <span><span className="text-gray-500">주소</span> 서울시 은평구 불광로 105</span>
          <span><span className="text-gray-500">연락처</span> 010-4577-3797</span>
          <span><span className="text-gray-500">이메일</span> sungsick.park@gmail.com</span>
          <span><span className="text-gray-500">업태</span> 정보통신업 / 서비스업</span>
          <span><span className="text-gray-500">종목</span> 시스템소프트웨어 개발 및 공급업 / 온라인 교육학원 / 강사</span>
        </div>
        <p className="mt-4 text-gray-600">© 2026 여행 일지 다이어리. All rights reserved.</p>
      </div>
    </footer>
  );
}
