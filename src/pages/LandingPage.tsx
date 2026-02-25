import { ArrowRight, Shield, Users, Trophy, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-200">
              Z
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">FinanZ</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-purple-100 flex items-center gap-2 group"
            >
              APP
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-bold mb-6">
              <Zap className="w-4 h-4 fill-purple-600" />
              NOVA ERA DA GESTÃO FINANCEIRA
            </div>
            <h1 className="text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-8">
              Domine suas finanças com <span className="text-purple-600">FinanZ</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-xl">
              A plataforma definitiva para controle de gastos pessoais e familiares. 
              Transforme a maneira como você lida com dinheiro através de gamificação e colaboração real.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/dashboard" 
                className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 flex items-center gap-3"
              >
                Começar Agora Grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-[2rem] p-4 shadow-2xl">
              <img 
                src="https://picsum.photos/seed/finance/1200/800" 
                alt="FinanZ Dashboard Preview" 
                className="rounded-2xl shadow-lg w-full object-cover aspect-[4/3]"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 hidden md:block animate-bounce-slow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">+110 Pontos</p>
                  <p className="text-xs text-gray-500">Ranking Mensal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-bold mb-6 tracking-tight">Tudo o que você precisa para prosperar</h2>
            <p className="text-lg text-gray-600">
              Desenvolvemos ferramentas poderosas que tornam a gestão financeira simples, divertida e extremamente eficaz.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users}
              title="Modo Família"
              description="Compartilhe contas, gerencie cartões e planeje o futuro com quem você ama em um ambiente colaborativo."
            />
            <FeatureCard 
              icon={Trophy}
              title="Ranking & Gamificação"
              description="Ganhe pontos por cada transação registrada e dispute o topo do ranking familiar todos os meses."
            />
            <FeatureCard 
              icon={Shield}
              title="Segurança Total"
              description="Seus dados são protegidos por criptografia de ponta a ponta e regras de acesso rigorosas."
            />
            <FeatureCard 
              icon={Zap}
              title="Lançamentos Rápidos"
              description="Adicione despesas e receitas em segundos. Interface otimizada para agilidade no dia a dia."
            />
            <FeatureCard 
              icon={CheckCircle2}
              title="Relatórios Inteligentes"
              description="Visualize para onde seu dinheiro está indo com gráficos intuitivos e análises de tendências."
            />
            <FeatureCard 
              icon={Users}
              title="Gestão de Membros"
              description="Adicione membros por e-mail, defina administradores e controle quem acessa as informações."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-purple-600 rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-purple-200">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[100px]"></div>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-8 relative z-10">Pronto para transformar sua vida financeira?</h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto relative z-10">
            Junte-se a milhares de pessoas que já estão no controle total de suas contas com o FinanZ.
          </p>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-purple-600 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all shadow-xl relative z-10"
          >
            Começar Agora
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              Z
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">FinanZ</span>
          </div>
          <p className="text-gray-500 text-sm">© 2025 FinanZ. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-purple-600">Privacidade</a>
            <a href="#" className="hover:text-purple-600">Termos</a>
            <a href="#" className="hover:text-purple-600">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/5 transition-all group">
      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-purple-600" />
      </div>
      <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
