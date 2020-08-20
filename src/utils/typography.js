import Typography from "typography"
import typographytheme from "typography-theme-twin-peaks"

// Wordpress2016.overrideThemeStyles = () => {
//   return {
//     "a.gatsby-resp-image-link": {
//       boxShadow: `none`,
//     },
//   }
// }

typographytheme.overrideThemeStyles = () => {
  return {
    "h1 > a": {
      backgroundImage: `none`,
    }, 
    "html": {
      scrollBehavior: "smooth"
    }
  }
}

// delete Wordpress2016.googleFonts

const typography = new Typography(typographytheme)

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
