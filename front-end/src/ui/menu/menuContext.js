import { createContext, useContext } from 'react';

/**
 * What a dish line needs to know about the menu around it: which hall it is
 * on (dish ids are per hall), the campus scores loaded for this menu, and how
 * to open the ranking sheet. Default: nothing, so a line outside a menu
 * renders without scores.
 */
export const MenuContext = createContext({ hall: null, scores: {}, mine: () => null, rank: null });

export const useMenuContext = () => useContext(MenuContext);
