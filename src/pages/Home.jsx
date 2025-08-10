export default function Home() {
    return (
      <div className="min-h-screen bg-gray-200 p-6">
        <div className="max-w-7xl mx-auto bg-white border-2 border-black rounded-lg shadow-2xl overflow-hidden">
          <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left side - Main intro */}
              <div className="text-center md:text-left">
                <h1 className="text-5xl font-bold text-gray-800 mb-4">
                  John Batista Alvarez
                </h1>
                <p className="text-2xl text-blue-600 mb-6">Software Developer</p>
                <div className="space-y-4">
                  <p className="text-lg text-gray-600">
                    Passionate about creating innovative solutions through code
                  </p>
                  <div className="flex justify-center md:justify-start space-x-4 mt-8">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                      View My Work
                    </button>
                    <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg transition-colors">
                      Contact Me
                    </button>
                  </div>
                </div>
              </div>

              {/* Right side - Biography */}
              <div className="bg-gray-50 p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">About Me</h2>
                <div className="space-y-4 text-gray-700">
                  <p>
                    I'm a dedicated software developer with a passion for creating efficient, 
                    scalable, and user-friendly applications. My journey in technology began 
                    with curiosity and has evolved into a career focused on continuous learning 
                    and innovation.
                  </p>
                  <p>
                    With expertise in modern web technologies including React, JavaScript, 
                    and TypeScript, I enjoy tackling complex problems and turning ideas into 
                    reality. I believe in writing clean, maintainable code that not only 
                    works but also tells a story.
                  </p>
                  <p>
                    When I'm not coding, you can find me exploring new technologies, 
                    contributing to open-source projects, or sharing knowledge with the 
                    developer community. I'm always excited about the next challenge 
                    and opportunity to grow.
                  </p>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Skills & Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">React</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">TypeScript</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">JavaScript</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Node.js</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Tailwind CSS</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">Git</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
