export default function Footer() {
  return (
    <footer className="bg-[#0082CA] text-white text-xs font-medium py-5 px-6 border-t-2 border-[#FFCB05] mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        <span>© Trip Manager. All rights reserved.</span>
        <div className="flex space-x-4 font-bold uppercase text-[11px]">
          <span className="hover:underline cursor-pointer">Terms & Conditions</span>
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span className="hover:underline cursor-pointer">Support</span>
        </div>
      </div>
    </footer>
  );
}