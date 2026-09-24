import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, KeyRound, Mail, Sparkles, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"

// Simple SVG components for brand icons as placeholders
const GoogleIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src="https://svgl.app/library/google.svg" {...props} />
)

const MicrosoftIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src="https://svgl.app/library/microsoft.svg" {...props} />
)

const AppleIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const { theme } = useTheme();
  return (
    <img src={`https://svgl.app/library/apple${theme === 'dark' ? '_dark' : ''}.svg`} {...props} />
  )
}

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onEmailSubmit?: (data: { email: string; password?: string }, isRegistration?: boolean) => void
  onSocialSignIn?: (provider: 'google' | 'microsoft' | 'apple' | 'sso') => void
  onEmailLink?: () => void
  onForgotPassword?: () => void
  loading?: boolean
  error?: string | null
  message?: string | null
  isAdminExists?: boolean | null
}

const AuthForm = React.forwardRef<HTMLDivElement, AuthFormProps>(
  ({ className, onEmailSubmit, onSocialSignIn, onEmailLink, onForgotPassword, loading, error, message, isAdminExists, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isRegisterMode, setIsRegisterMode] = React.useState(false)

    // Sync register mode with isAdminExists if it changes
    React.useEffect(() => {
      if (isAdminExists === false) {
        setIsRegisterMode(true)
      } else if (isAdminExists === true) {
        setIsRegisterMode(false)
      }
    }, [isAdminExists])

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      onEmailSubmit?.({ email, password }, isRegisterMode)
    }

    return (
      <Card ref={ref} className={cn("w-full max-w-md mx-auto border-white/5 bg-[hsl(20,14.3%,4.1%)] text-white shadow-2xl", className)} {...props}>
        <CardHeader className="text-left">
          <CardTitle className="text-2xl font-black tracking-tighter uppercase">
            {isRegisterMode ? "Setup Master Access" : "Identity Authentication"}
          </CardTitle>
          <CardDescription className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
            {isRegisterMode ? "No administrator detected. Initialize the secure hub." : "Authorized Creator Personnel Only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Email Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[9px] uppercase tracking-widest font-black text-white/20 ml-1" htmlFor="email">Identity Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="IDENTITY@CREATOR.COM" 
                    className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/5 h-14 rounded-xl focus-visible:ring-white/20" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[9px] uppercase tracking-widest font-black text-white/20" htmlFor="password">Security Keyphrase</Label>
                  {!isRegisterMode && (
                    <button 
                      type="button"
                      onClick={onForgotPassword}
                      className="text-[9px] uppercase tracking-widest font-black text-white/20 hover:text-white transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••••"
                    className="pl-12 pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/5 h-14 rounded-xl focus-visible:ring-white/20" 
                    required 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-white/20 hover:text-white hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500 text-center">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-green-500 text-center">
                  {message}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-14 bg-white text-black hover:bg-white/90 rounded-xl font-black uppercase text-[10px] tracking-[0.4em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRegisterMode ? "Initialize Secure Hub" : "Establish Secure Session")}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-center space-y-6 pt-0 pb-8">
          <Button variant="ghost" className="text-white/20 hover:text-white/40 text-[9px] uppercase tracking-widest font-black" onClick={() => onEmailLink?.()}>
            <Sparkles className="mr-2 h-3 w-3" />
            Request Magic Link
          </Button>
          <p className="text-[8px] text-white/10 text-center w-64 uppercase font-black tracking-widest leading-relaxed">
            By initializing, you accept our <a href="#" className="underline hover:text-white/20">Protocols</a> & <a href="#" className="underline hover:text-white/20">Encryption Standart</a>.
          </p>
        </CardFooter>
      </Card>
    )
  }
)
AuthForm.displayName = "AuthForm"

export { AuthForm }
