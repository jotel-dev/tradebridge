use anchor_lang::prelude::*;

declare_id!("3dmv4RrSanjP9Qdaj4E3D9ra9YNJrDg4QZP9sCmaK81v");

#[program]
pub mod tradebridge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
